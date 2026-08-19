/**
 * The review overlay.
 *
 * Corrections from a native speaker land in `content/<lang>/review.json`
 * rather than being written back into the hand-authored source. That
 * separation matters for a few reasons:
 *
 *   - `source.ts` stays readable and hand-editable; nothing machine-writes
 *     it, so a bad import cannot mangle the draft of record.
 *   - Review state is data, so it diffs cleanly and several reviewers can
 *     be merged without conflict.
 *   - Provenance is derived rather than asserted: a record is `reviewed`
 *     because someone signed off on it here, not because a literal in the
 *     build script says so.
 *
 * Entries are keyed by a hash of the *original* Bangla text, so a reviewer
 * correcting the spelling does not orphan their own correction.
 */

export type Verdict =
  | 'ok'      // correct as drafted
  | 'fix'     // corrected — the *_fixed fields carry the replacement
  | 'drop';   // wrong or not worth teaching; withheld from the course

export interface ReviewEntry {
  /** Stable key: hash of type + original Bangla. */
  id: string;
  kind: 'lexeme' | 'sentence';
  /** What was reviewed, as it appeared at export time. */
  original: { bangla: string; roman: string; english: string };
  verdict: Verdict;
  /** Only the fields the reviewer actually changed. */
  fixed?: Partial<{ bangla: string; roman: string; english: string }>;
  note?: string;
  reviewer: string;
  reviewedAt: string;
}

export interface ReviewFile {
  course: string;
  entries: ReviewEntry[];
}

/**
 * Stable id for a reviewable record.
 *
 * Hashes the *original* text so corrections stay attached to what was
 * reviewed. Deliberately not the generated lexeme id, which embeds the
 * romanization — a reviewer fixing the romanization would change the id
 * and silently detach their own correction.
 */
export function reviewId(kind: 'lexeme' | 'sentence', bangla: string, hash: (s: string) => string): string {
  return `${kind === 'lexeme' ? 'L' : 'S'}-${hash(`${kind}|${bangla.normalize('NFC')}`).slice(0, 10)}`;
}

/** Index an overlay for lookup during the build. */
export function indexReview(file: ReviewFile | null): Map<string, ReviewEntry> {
  const out = new Map<string, ReviewEntry>();
  for (const e of file?.entries ?? []) out.set(e.id, e);
  return out;
}

/** Apply a reviewer's corrections to a drafted record. */
export function applyReview<T extends { bangla: string; roman: string; english: string }>(
  record: T,
  entry: ReviewEntry | undefined
): { record: T; status: 'draft' | 'reviewed'; dropped: boolean; reviewer?: string } {
  if (!entry) return { record, status: 'draft', dropped: false };
  if (entry.verdict === 'drop') {
    return { record, status: 'reviewed', dropped: true, reviewer: entry.reviewer };
  }
  const fixed = entry.fixed ?? {};
  return {
    record: {
      ...record,
      bangla: fixed.bangla?.normalize('NFC') ?? record.bangla,
      roman: fixed.roman ?? record.roman,
      english: fixed.english ?? record.english
    },
    status: 'reviewed',
    dropped: false,
    reviewer: entry.reviewer
  };
}

/** Progress summary, for the build log and the review dashboard. */
export function reviewStats(total: number, index: Map<string, ReviewEntry>) {
  let ok = 0, fixed = 0, dropped = 0;
  for (const e of index.values()) {
    if (e.verdict === 'ok') ok++;
    else if (e.verdict === 'fix') fixed++;
    else dropped++;
  }
  const done = ok + fixed + dropped;
  return { total, reviewed: done, ok, fixed, dropped, remaining: total - done };
}
