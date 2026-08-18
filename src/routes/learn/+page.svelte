<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { session, glyphById, SHOW_DRAFTS, noteById } from '$ui/session.svelte';
  import { play, canPlay } from '$ui/audio';
  import type { Grade } from '$engine/scheduler';

  let picked = $state<string | null>(null);
  let revealed = $state(false);
  let built = $state<string[]>([]);   // word-spell: tiles tapped so far
  let spellWrong = $state(false);
  let openNote = $state<string | null>(null);

  onMount(() => { if (!session.ready) session.load(); });

  const task = $derived(session.current);
  const isCorrect = $derived(picked !== null && task !== null && picked === task.answer);
  const glyph = $derived(task?.tier === 'glyph' ? glyphById.get(task.id) : undefined);
  const notes = $derived(
    task?.tier === 'sentence' ? (session.notesFor(task.id) ?? []) : []
  );

  const clozeParts = $derived.by(() => {
    if (!task?.blank) return null;
    return { before: task.prompt.slice(0, task.blank.start), after: task.prompt.slice(task.blank.end) };
  });

  const builtWord = $derived(built.join(''));
  const spellDone = $derived(task?.kind === 'word-spell' && builtWord === task.answer);

  // Reset per-card UI whenever the card changes.
  $effect(() => {
    task?.id;
    task?.kind;
    picked = null;
    revealed = false;
    built = [];
    spellWrong = false;
    openNote = null;
  });

  function choose(option: string) {
    if (picked !== null) return;
    picked = option;
    revealed = true;
    if (option !== task?.answer) grade('again');
  }

  function tapTile(tile: string) {
    if (revealed) return;
    built = [...built, tile];
    spellWrong = false;
    if (built.join('') === task?.answer) { revealed = true; }
  }

  function undo() {
    built = built.slice(0, -1);
    spellWrong = false;
  }

  function checkSpelling() {
    if (builtWord === task?.answer) { revealed = true; return; }
    spellWrong = true;
    revealed = true;
    grade('again');
  }

  async function grade(g: Grade) {
    await session.answer(g);
  }
</script>

{#if !session.ready}
  <p class="muted" style="margin-top: 2rem;">Loading…</p>
{:else if !task}
  <div class="card center" style="margin-top: 2rem;">
    <h2 style="margin: 0 0 0.4rem;">Nothing due</h2>
    <p class="muted small" style="margin: 0 0 1rem;">
      You've reached the end of the available content. More arrives as the course is reviewed.
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
      {:else if task.kind === 'word-spell'}Spell this word in Bangla
      {:else if task.kind === 'cloze'}Which word completes the sentence?
      {:else if task.kind === 'word-listen'}Which word did you hear?
      {:else if task.kind === 'sentence-listen'}What did you hear?
      {:else}What does this mean?{/if}
    </p>

    {#if canPlay(task.audio)}
      <button
        onclick={() => play(task.audio, base)}
        style="margin-bottom: 0.9rem; display: inline-flex; align-items: center; gap: 0.5rem;"
      >▶ Play</button>
    {/if}

    {#if task.kind === 'word-spell'}
      <!-- Prompted in romanization so this tests spelling, not reading —
           the gap a heritage learner actually has. -->
      <p style="margin: 0 0 0.2rem; font-size: 1.5rem; font-style: italic;">{task.prompt}</p>
      {#if task.note}<p class="muted small" style="margin: 0 0 0.9rem;">“{task.note}”</p>{/if}
      <div
        class="bn bn-lg"
        style="min-height: 3.2rem; border-bottom: 2px dashed var(--border); margin-bottom: 0.4rem;"
        aria-live="polite"
      >{builtWord}</div>
      {#if spellWrong}
        <p class="small" style="color: var(--bad); margin: 0.3rem 0 0;">
          Not quite — it's <span class="bn">{task.answer}</span>
        </p>
      {/if}
    {:else if clozeParts}
      <p class="bn bn-lg" style="margin: 0 0 0.4rem;">
        {clozeParts.before}<span
          style="border-bottom: 2px dashed var(--accent); padding: 0 1.4rem;"
        >{revealed ? task.answer : ''}</span>{clozeParts.after}
      </p>
    {:else if task.prompt}
      <p class="bn {task.tier === 'glyph' ? 'bn-display' : 'bn-lg'}" style="margin: 0 0 0.4rem;">
        {task.prompt}
      </p>
    {:else}
      <p class="muted" style="margin: 0 0 0.4rem; font-size: 1.1rem;">🎧 Listen and choose</p>
    {/if}

    {#if task.context}
      <p class="muted small" style="margin: 0.1rem 0 0;">
        as in <span class="bn bn-md">{task.context.form}</span>
        <span class="faint">— {task.context.roman}, “{task.context.gloss}”</span>
      </p>
    {/if}

    {#if glyph?.prebase}
      <p class="small prebase" style="margin: 0.2rem 0 0;">
        ⚠ Written <strong>before</strong> its consonant, but pronounced after it.
      </p>
    {/if}
    {#if revealed && task.note && task.kind !== 'word-spell'}
      <p class="muted small" style="margin: 0.5rem 0 0;">{task.note}</p>
    {/if}
  </div>

  {#if task.kind === 'word-spell'}
    <div style="margin-top: 1rem;">
      <div style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
        {#each task.tiles ?? [] as tile, i}
          <button
            class="bn"
            style="font-size: 1.5rem; padding: 0.55rem 0.9rem; min-width: 3.2rem;"
            onclick={() => tapTile(tile)}
            disabled={revealed}
          >{tile}</button>
        {/each}
      </div>
      <div class="row" style="margin-top: 0.9rem; gap: 0.5rem;">
        <button onclick={undo} disabled={revealed || built.length === 0} style="flex: 1;">Undo</button>
        <button class="btn-primary" onclick={checkSpelling} disabled={revealed || built.length === 0} style="flex: 2;">
          Check
        </button>
      </div>
    </div>
  {:else if task.options}
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

  {#if revealed && (isCorrect || spellDone)}
    <div style="margin-top: 1.1rem;">
      <p class="muted small center" style="margin: 0 0 0.6rem;">How did that feel?</p>
      <div class="btn-row">
        <button onclick={() => grade('again')}>Again</button>
        <button onclick={() => grade('hard')}>Hard</button>
        <button class="btn-primary" onclick={() => grade('good')}>Good</button>
        <button onclick={() => grade('easy')}>Easy</button>
      </div>
    </div>
  {/if}

  {#if notes.length > 0}
    <div style="margin-top: 1.4rem;">
      {#each notes as note}
        <button
          class="choice small"
          style="text-align: left;"
          onclick={() => (openNote = openNote === note.id ? null : note.id)}
          aria-expanded={openNote === note.id}
        >
          {openNote === note.id ? '▾' : '▸'} {note.title}
        </button>
        {#if openNote === note.id}
          <div class="card small" style="margin: -0.2rem 0 0.6rem;">
            {#each note.body.split('\n\n') as para}
              <p class="muted" style="margin: 0 0 0.6rem;">{@html para
                .replace(/&/g, '&amp;').replace(/</g, '&lt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong class="bn-inline">$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>')}</p>
            {/each}
          </div>
        {/if}
      {/each}
    </div>
  {/if}
{/if}
