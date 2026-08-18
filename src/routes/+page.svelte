<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { session, course, SHOW_DRAFTS, lexemeById, coverageModel } from '$ui/session.svelte';
  import { highestValueNext } from '$engine/coverage';

  onMount(() => { session.load(); });

  const pct = (x: number) => Math.round(x * 100);
  let nextWords = $derived(
    highestValueNext(coverageModel, session.known.lexemes, 5)
      .map((w) => lexemeById.get(w.id))
      .filter((w): w is NonNullable<typeof w> => w !== undefined)
  );
</script>

<header class="stack" style="margin: 1.4rem 0 1.6rem;">
  <div class="spread">
    <div>
      <h1 style="margin: 0; font-size: 1.5rem; letter-spacing: -0.01em;">zuban</h1>
      <p class="muted small" style="margin: 0.15rem 0 0;">
        {course.meta.nativeName} · {course.meta.description}
      </p>
    </div>
    <span class="tag">{course.meta.code}</span>
  </div>
</header>

{#if SHOW_DRAFTS}
  <p class="banner" style="margin-bottom: 1rem;">
    <strong>Unreviewed content.</strong> This course is machine-drafted and has not
    been checked by a native speaker. Expect errors — see the review workflow in the README.
  </p>
{/if}

{#if !session.ready}
  <p class="muted">Loading…</p>
{:else}
  <div class="stack">
    <!-- Coverage is the headline number: honest, checkable, and it moves
         fast early because word frequency is brutally top-heavy. -->
    <section class="card">
      <div class="spread">
        <span class="muted small">Everyday Bangla you can follow</span>
        <strong style="font-size: 1.35rem;">{pct(session.coverage)}%</strong>
      </div>
      <div class="meter" style="margin-top: 0.7rem;"><i style="width: {pct(session.coverage)}%"></i></div>
      <p class="faint small" style="margin: 0.6rem 0 0;">
        Estimated from word frequency across {course.lexemes.length} words in the course.
      </p>
    </section>

    <div class="row" style="gap: 0.85rem;">
      <section class="card" style="flex: 1;">
        <div class="muted small">Script</div>
        <strong style="font-size: 1.25rem;">{pct(session.scriptProgress)}%</strong>
        <div class="meter" style="margin-top: 0.5rem;"><i style="width: {pct(session.scriptProgress)}%"></i></div>
      </section>
      <section class="card" style="flex: 1;">
        <div class="muted small">Sentences readable</div>
        <strong style="font-size: 1.25rem;">{pct(session.readable)}%</strong>
        <div class="meter" style="margin-top: 0.5rem;"><i style="width: {pct(session.readable)}%"></i></div>
      </section>
    </div>

    {#if session.needsPlacement}
      <!-- Placement first: without it every learner is treated as a cold
           beginner, which wastes a heritage speaker's time on vocabulary
           they already have. -->
      <a class="btn btn-primary center" href="{base}/placement" style="display: grid; place-items: center; text-decoration: none;">
        Find where to start
      </a>
      <a class="btn center" href="{base}/learn" style="display: grid; place-items: center; text-decoration: none;">
        Skip — start from the beginning
      </a>
    {:else}
      <a class="btn btn-primary center" href="{base}/learn" style="display: grid; place-items: center; text-decoration: none;">
        {session.dueCount > 0 ? `Review ${session.dueCount} · then learn` : 'Continue learning'}
      </a>
    {/if}

    {#if nextWords.length}
      <section class="card">
        <div class="muted small" style="margin-bottom: 0.6rem;">Highest-value words to learn next</div>
        <div class="stack" style="gap: 0.5rem;">
          {#each nextWords as w}
            <div class="spread">
              <span class="bn bn-md">{w.form}</span>
              <span class="muted small">{w.roman} · {w.gloss[0]}</span>
            </div>
          {/each}
        </div>
      </section>
    {/if}
  </div>
{/if}
