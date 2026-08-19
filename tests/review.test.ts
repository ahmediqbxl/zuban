import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  applyReview, indexReview, reviewId, reviewStats,
  type ReviewEntry, type ReviewFile
} from '../src/lib/content/review';

const sha1 = (s: string) => createHash('sha1').update(s).digest('hex');
const id = (kind: 'lexeme' | 'sentence', bangla: string) => reviewId(kind, bangla, sha1);

const entry = (over: Partial<ReviewEntry> = {}): ReviewEntry => ({
  id: id('lexeme', 'ভালো'),
  kind: 'lexeme',
  original: { bangla: 'ভালো', roman: 'bhalo', english: 'good' },
  verdict: 'ok',
  reviewer: 'Reviewer',
  reviewedAt: '2026-01-01T00:00:00Z',
  ...over
});

describe('review ids', () => {
  it('are stable for the same text', () => {
    expect(id('lexeme', 'ভালো')).toBe(id('lexeme', 'ভালো'));
  });

  it('do not depend on the romanization', () => {
    // The whole reason ids hash the Bangla rather than the generated
    // lexeme id: a reviewer fixing the romanization must not orphan their
    // own correction.
    const before = id('lexeme', 'ভালো');
    const after = id('lexeme', 'ভালো'); // roman changed elsewhere; id must not
    expect(after).toBe(before);
  });

  it('distinguish a word from an identical-looking sentence', () => {
    expect(id('lexeme', 'ধন্যবাদ')).not.toBe(id('sentence', 'ধন্যবাদ'));
  });

  it('are unaffected by unicode normalisation form', () => {
    // ড় is composition-excluded, so the same word can arrive decomposed.
    const composed = 'বড়'.normalize('NFC');
    const decomposed = 'বড়'.normalize('NFD');
    expect(id('lexeme', decomposed)).toBe(id('lexeme', composed));
  });
});

describe('applying a review', () => {
  const rec = { bangla: 'ভালো', roman: 'bhalo', english: 'good' };

  it('leaves an unreviewed record as draft', () => {
    const r = applyReview(rec, undefined);
    expect(r.status).toBe('draft');
    expect(r.dropped).toBe(false);
    expect(r.record).toEqual(rec);
  });

  it('marks an approved record reviewed without changing it', () => {
    const r = applyReview(rec, entry({ verdict: 'ok' }));
    expect(r.status).toBe('reviewed');
    expect(r.record).toEqual(rec);
    expect(r.reviewer).toBe('Reviewer');
  });

  it('applies only the fields the reviewer changed', () => {
    const r = applyReview(rec, entry({ verdict: 'fix', fixed: { english: 'good, well' } }));
    expect(r.record.english).toBe('good, well');
    expect(r.record.bangla).toBe('ভালো');
    expect(r.record.roman).toBe('bhalo');
  });

  it('normalises a corrected Bangla spelling', () => {
    const r = applyReview(rec, entry({ verdict: 'fix', fixed: { bangla: 'বড়'.normalize('NFD') } }));
    expect(r.record.bangla).toBe('বড়'.normalize('NFC'));
  });

  it('signals a dropped record rather than silently keeping it', () => {
    const r = applyReview(rec, entry({ verdict: 'drop' }));
    expect(r.dropped).toBe(true);
    expect(r.status).toBe('reviewed');
  });
});

describe('review stats', () => {
  it('counts each verdict and what is left', () => {
    const file: ReviewFile = {
      course: 'bn-BD',
      entries: [
        entry({ id: 'a', verdict: 'ok' }),
        entry({ id: 'b', verdict: 'fix', fixed: { english: 'x' } }),
        entry({ id: 'c', verdict: 'drop' })
      ]
    };
    const s = reviewStats(10, indexReview(file));
    expect(s).toMatchObject({ total: 10, reviewed: 3, ok: 1, fixed: 1, dropped: 1, remaining: 7 });
  });

  it('handles no review file at all', () => {
    expect(reviewStats(5, indexReview(null))).toMatchObject({ reviewed: 0, remaining: 5 });
  });
});

describe('CSV round-trip through the real scripts', () => {
  /**
   * The parser is the riskiest part of the workflow: a gloss containing a
   * comma, or a note a reviewer types with quotes in it, would shift every
   * column and silently corrupt the import. Exercise it against the actual
   * script rather than a reimplementation.
   */
  it('survives commas, quotes, newlines and the Excel BOM', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zuban-review-'));
    try {
      const csv = join(dir, 'r.csv');
      const rows = [
        'id,type,bangla,romanization,english,verdict,bangla_fixed,romanization_fixed,english_fixed,note',
        // gloss with a comma, note with escaped quotes, note with a newline
        `${id('lexeme', 'আমি')},lexeme,আমি,ami,"I, me",fix,,,"I (first person)","Reviewer said ""use this one"""`,
        `${id('lexeme', 'না')},lexeme,না,na,"no, not",ok,,,,"line one\nline two"`
      ];
      writeFileSync(csv, '﻿' + rows.join('\r\n') + '\r\n', 'utf-8');

      const out = execFileSync(
        'node',
        ['scripts/review-import.mjs', csv, '--reviewer', 'CSV Test', '--dry-run'],
        { encoding: 'utf-8' }
      );
      // Both rows parsed and neither rejected. Asserted on the parse count
      // rather than new-vs-updated, which depends on whether a review
      // overlay happens to exist in the working tree.
      expect(out).toMatch(/parsed 2 rows/);
      expect(out).toMatch(/1 ok, 1 corrected/);
      expect(out).not.toMatch(/rejected/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a "fix" with no correction rather than importing a no-op', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zuban-review-'));
    try {
      const csv = join(dir, 'r.csv');
      writeFileSync(csv,
        'id,type,bangla,romanization,english,verdict,bangla_fixed,romanization_fixed,english_fixed,note\n' +
        `${id('lexeme', 'আমি')},lexeme,আমি,ami,I,fix,,,,\n`, 'utf-8');
      let output = '';
      try {
        execFileSync('node', ['scripts/review-import.mjs', csv, '--reviewer', 'X', '--dry-run'], { encoding: 'utf-8' });
      } catch (e: unknown) {
        output = String((e as { stdout?: string }).stdout ?? '');
      }
      expect(output).toMatch(/marked "fix" but no correction/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rejects a row whose word is not in the course', () => {
    const dir = mkdtempSync(join(tmpdir(), 'zuban-review-'));
    try {
      const csv = join(dir, 'r.csv');
      writeFileSync(csv,
        'id,type,bangla,romanization,english,verdict,bangla_fixed,romanization_fixed,english_fixed,note\n' +
        'L-deadbeef00,lexeme,ঝঝঝঝ,zzz,nonsense,ok,,,,\n', 'utf-8');
      let output = '';
      try {
        execFileSync('node', ['scripts/review-import.mjs', csv, '--reviewer', 'X', '--dry-run'], { encoding: 'utf-8' });
      } catch (e: unknown) {
        output = String((e as { stdout?: string }).stdout ?? '');
      }
      expect(output).toMatch(/not in the current course/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
