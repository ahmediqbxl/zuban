<script lang="ts">
  import { course } from '$ui/session.svelte';
  import { analyze, clusters } from '$content/scripts/bengali';

  /**
   * Bengali rendering self-test.
   *
   * Open this on every device you care about. Conjuncts and vowel signs
   * are the most fragile part of Bengali text: when shaping fails the
   * script does not degrade gracefully, it becomes unreadable — and it
   * fails differently per font, per OS, and per browser.
   *
   * Noto Sans Bengali has open upstream bugs of exactly this kind, which
   * is why the app vendors its font rather than trusting the system.
   */
  const cases: Array<{ text: string; expect: string; why: string }> = [
    {
      text: 'স্কুল',
      expect: 'skul — "school"',
      why: 'Known Noto Sans Bengali bug: ল can wrongly ligate with ু, rendering this illegibly.'
    },
    {
      text: 'হ্ন / হ্ণ',
      expect: 'two visibly different shapes',
      why: 'Reported upstream as swapped in Noto Sans Bengali. If they look identical or wrong, the font is bad.'
    },
    { text: 'ক্ষমা', expect: 'khoma — ক+ষ as one shape', why: 'Common conjunct; must not show a visible হসন্ত.' },
    { text: 'জ্ঞান', expect: 'gyan — ঞ merged into জ', why: 'Fully opaque ligature; a fallback font will break it apart.' },
    { text: 'বিদ্যালয়', expect: 'biddaloy', why: 'দ্য conjunct plus a pre-base ি and a য় nukta form.' },
    { text: 'উচ্চারণ', expect: 'uchcharon', why: 'Doubled চ্চ conjunct.' },
    { text: 'সংস্কৃত', expect: 'songskrito', why: 'অনুস্বার next to a conjunct carrying ৃ.' },
    { text: 'বিশ্ববিদ্যালয়', expect: 'bishshobiddaloy', why: 'Stacked conjuncts — the hardest common word to shape.' },
    { text: 'কি কী', expect: 'visibly different vowel lengths', why: 'ি vs ী must be distinguishable at body size.' },
    { text: 'বড় ঢ়াকা য়', expect: 'dots visible beneath ড ঢ য', why: 'Nukta forms; the dot must sit below, not beside.' }
  ];

  const prebaseDemo = 'কি কে কৈ কো কৌ';
</script>

<header style="margin: 1.4rem 0 1.2rem;">
  <h1 style="margin: 0; font-size: 1.35rem;">Script check</h1>
  <p class="muted small" style="margin: 0.25rem 0 0;">
    Rendering self-test for {course.meta.font}. Open on each target device.
  </p>
</header>

<p class="banner" style="margin-bottom: 1.1rem;">
  If any line below looks broken — letters separated that should join, a dotted
  circle, a vowel sign stacked on the wrong letter — the font is not shaping
  correctly on this device and the course will be unreadable here.
</p>

<div class="stack">
  {#each cases as c}
    <section class="card">
      <p class="bn bn-lg" style="margin: 0 0 0.35rem;">{c.text}</p>
      <div class="muted small">Expected: {c.expect}</div>
      <div class="faint small" style="margin-top: 0.25rem;">{c.why}</div>
    </section>
  {/each}

  <section class="card">
    <div class="muted small" style="margin-bottom: 0.4rem;">
      Pre-base vowel signs — each is typed <em>after</em> ক but drawn before or around it
    </div>
    <p class="bn bn-lg" style="margin: 0;">{prebaseDemo}</p>
  </section>

  <section class="card">
    <div class="muted small" style="margin-bottom: 0.5rem;">
      Cluster segmentation — what the analyzer sees
    </div>
    {#each ['বিশ্ববিদ্যালয়', 'স্কুল', 'হয়েছে'] as w}
      <div class="spread" style="padding: 0.35rem 0; border-bottom: 1px solid var(--border);">
        <span class="bn bn-md">{w}</span>
        <span class="faint small bn">{clusters(w).join(' · ')}</span>
      </div>
    {/each}
    <p class="faint small" style="margin: 0.6rem 0 0;">
      Each cluster must rejoin to the original word with nothing added or lost.
    </p>
  </section>

  <section class="card">
    <div class="muted small" style="margin-bottom: 0.5rem;">
      Conjuncts in this course ({course.glyphs.filter((g) => g.kind === 'conjunct').length})
    </div>
    <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
      {#each course.glyphs.filter((g) => g.kind === 'conjunct') as g}
        <span class="tag bn" style="font-size: 1.1rem; padding: 0.3rem 0.55rem;">{g.form}</span>
      {/each}
    </div>
  </section>
</div>
