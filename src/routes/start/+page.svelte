<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { session, course } from '$ui/session.svelte';
  import { TRACKS } from '$engine/sequencer';

  let saving = $state(false);

  onMount(() => { if (!session.ready) session.load(); });

  async function choose(goal: 'speaking' | 'script') {
    saving = true;
    if (goal === 'speaking') {
      // Straight in. A learner who only wants to speak has nothing to gain
      // from a reading test, and being asked to decode Bangla before they
      // start is exactly the barrier they came here to avoid.
      await session.setTrack(TRACKS.speaking, { listening: 0, script: 0, label: 'speaking' });
      await goto(`${base}/learn`);
    } else {
      await goto(`${base}/placement`);
    }
  }
</script>

<header style="margin: 2.2rem 0 1.8rem;">
  <p class="muted small" style="margin: 0 0 0.5rem;">{course.meta.nativeName} · {course.meta.description}</p>
  <h1 style="margin: 0; font-size: 1.75rem; line-height: 1.15;">What do you want to do with Bangla?</h1>
</header>

<div class="stack">
  <button class="goal-card" onclick={() => choose('speaking')} disabled={saving}>
    <strong>I want to speak it</strong>
    <span class="muted small">
      Understand people and say things back. Everything is written the way it
      sounds — <em>ami bhalo achhi</em> — and you never have to read Bangla script.
    </span>
    <span class="faint small">Talking to family · travel · getting by</span>
  </button>

  <button class="goal-card" onclick={() => choose('script')} disabled={saving}>
    <strong>I want to read and write too</strong>
    <span class="muted small">
      Adds the script — বাংলা — learned inside real words rather than off an
      alphabet chart. Slower to first conversation, but you can read signs,
      messages and names.
    </span>
    <span class="faint small">Literacy · heritage · study</span>
  </button>

  <p class="faint small center" style="margin: 0.4rem 0 0;">
    You can change this later, and switching keeps everything you've learned.
  </p>
</div>

<style>
  .goal-card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.45rem;
    text-align: left;
    padding: 1.15rem 1.2rem;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    width: 100%;
    min-height: auto;
  }
  .goal-card:hover { border-color: var(--accent); }
  .goal-card strong { font-size: 1.1rem; }
  .goal-card span { line-height: 1.5; }
</style>
