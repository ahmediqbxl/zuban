<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { session, glyphById, SHOW_DRAFTS } from '$ui/session.svelte';
  import type { Grade } from '$engine/scheduler';

  let picked = $state<string | null>(null);
  let revealed = $state(false);

  onMount(() => { if (!session.ready) session.load(); });

  const task = $derived(session.current);
  const isCorrect = $derived(picked !== null && task !== null && picked === task.answer);

  /** Cloze prompt split around the blank so the sentence stays readable. */
  const clozeParts = $derived.by(() => {
    if (!task?.blank) return null;
    return {
      before: task.prompt.slice(0, task.blank.start),
      after: task.prompt.slice(task.blank.end)
    };
  });

  const glyph = $derived(task?.tier === 'glyph' ? glyphById.get(task.id) : undefined);

  function choose(option: string) {
    if (picked !== null) return;
    picked = option;
    revealed = true;
    // A wrong answer is unambiguously "again" — no point asking how it felt.
    if (option !== task?.answer) grade('again');
  }

  async function grade(g: Grade) {
    await session.answer(g);
    picked = null;
    revealed = false;
  }
</script>

{#if !session.ready}
  <p class="muted" style="margin-top: 2rem;">Loading…</p>
{:else if !task}
  <div class="card center" style="margin-top: 2rem;">
    <h2 style="margin: 0 0 0.4rem;">Nothing due</h2>
    <p class="muted small" style="margin: 0 0 1rem;">
      You've reached the end of the available content. More arrives as the
      course is reviewed.
    </p>
    <a class="btn" href="{base}/" style="text-decoration: none; display: inline-grid; place-items: center;">Back to today</a>
  </div>
{:else}
  <div class="spread" style="margin: 1rem 0 1.4rem;">
    <span class="tag">{task.isNew ? 'New' : 'Review'}</span>
    <span class="faint small">{session.done} done · {session.dueCount} due</span>
  </div>

  <div class="card">
    <p class="muted small" style="margin: 0 0 0.9rem;">
      {#if task.kind === 'glyph-sound' && task.demo}How is this vowel sign pronounced?
      {:else if task.kind === 'glyph-sound'}How is this letter pronounced?
      {:else if task.kind === 'word-read'}What does this word mean?
      {:else if task.kind === 'cloze'}Which word completes the sentence?
      {:else if task.kind === 'word-listen'}Which word did you hear?
      {:else}What does this mean?{/if}
    </p>

    {#if clozeParts}
      <p class="bn bn-lg" style="margin: 0 0 0.4rem;">
        {clozeParts.before}<span
          style="border-bottom: 2px dashed var(--accent); padding: 0 1.4rem;"
        >{revealed ? task.answer : ''}</span>{clozeParts.after}
      </p>
    {:else}
      <p class="bn {task.tier === 'glyph' ? 'bn-display' : 'bn-lg'}" style="margin: 0 0 0.4rem;">
        {task.prompt}
      </p>
    {/if}

    {#if task.context}
      <!-- Script is always anchored to a real word; the letter is never
           an abstract shape on a chart. -->
      <p class="muted small" style="margin: 0.1rem 0 0;">
        as in <span class="bn bn-md">{task.context.form}</span>
        <span class="faint">— {task.context.roman}, "{task.context.gloss}"</span>
      </p>
    {/if}

    {#if glyph?.prebase}
      <!-- The most common early misread: ি ে ৈ are written before the
           consonant they follow in speech. Never let it pass silently. -->
      <p class="small prebase" style="margin: 0.2rem 0 0;">
        ⚠ Written <strong>before</strong> its consonant, but pronounced after it.
      </p>
    {/if}
    {#if revealed && task.note}
      <p class="muted small" style="margin: 0.5rem 0 0;">{task.note}</p>
    {/if}
  </div>

  {#if task.options}
    <!-- data-answer is a dev-only end-to-end test hook; it is absent from
         production builds, where SHOW_DRAFTS is false. -->
    <div style="margin-top: 1rem;" data-answer={SHOW_DRAFTS ? task.answer : undefined}>
      {#each task.options as option}
        <button
          class="choice {task.kind === 'cloze' ? 'bn bn-md' : ''}"
          data-state={revealed ? (option === task.answer ? 'right' : option === picked ? 'wrong' : undefined) : undefined}
          onclick={() => choose(option)}
          disabled={picked !== null}
        >{option}</button>
      {/each}
    </div>
  {/if}

  {#if revealed && isCorrect}
    <div style="margin-top: 1.1rem;">
      <!-- FSRS needs the difference between "instant" and "dragged it up",
           so a correct answer still asks. Wrong answers never reach here. -->
      <p class="muted small center" style="margin: 0 0 0.6rem;">How did that feel?</p>
      <div class="btn-row">
        <button onclick={() => grade('again')}>Again</button>
        <button onclick={() => grade('hard')}>Hard</button>
        <button class="btn-primary" onclick={() => grade('good')}>Good</button>
        <button onclick={() => grade('easy')}>Easy</button>
      </div>
    </div>
  {/if}
{/if}
