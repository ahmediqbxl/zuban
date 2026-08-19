<script lang="ts">
  import { course, lexemeById, glyphById, session } from '$ui/session.svelte';
  import { SOUND_GROUPS, type SoundNote } from '$course/bn/sounds';
  import { speech } from '$ui/speech.svelte';
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  let open = $state<string | null>('dental-retroflex');

  onMount(() => { if (!session.ready) session.load(); speech.init(); });

  /**
   * Real words from the course that use a sound.
   *
   * Examples are pulled from the actual lexicon rather than invented, so
   * every one is a word the learner will meet — and can be tapped to hear.
   */
  function examplesFor(note: SoundNote): Array<{ roman: string; gloss: string; form: string }> {
    const ids = course.glyphs
      .filter((g) => g.roman === note.roman.replace(/[()\s]|final /g, '') || note.script.includes(g.form))
      .map((g) => g.id);
    if (ids.length === 0) return [];
    return course.lexemes
      .filter((l) => l.glyphs.some((g) => ids.includes(g)))
      .sort((a, b) => (a.freqRank ?? 1e9) - (b.freqRank ?? 1e9))
      .slice(0, 3)
      .map((l) => ({ roman: l.roman, gloss: l.gloss[0], form: l.form }));
  }

  const showScript = $derived(session.track.script);
</script>

<header style="margin: 1.4rem 0 1.2rem;">
  <h1 style="margin: 0; font-size: 1.4rem;">Sounds</h1>
  <p class="muted small" style="margin: 0.25rem 0 0;">
    How to say what you're reading. Written for an English speaker.
  </p>
</header>

<p class="banner" style="margin-bottom: 1.1rem;">
  Until recordings exist, the spelling is all you have to go on — and it
  can't tell you everything. These are the differences worth getting right
  early, roughly in the order they'll trip you up.
</p>

<div class="stack">
  {#each SOUND_GROUPS as group}
    <section class="card" style="padding: 0;">
      <button
        style="width: 100%; text-align: left; background: none; border: 0; padding: 1rem 1.1rem; display: flex; align-items: flex-start; gap: 0.7rem;"
        onclick={() => (open = open === group.id ? null : group.id)}
        aria-expanded={open === group.id}
      >
        <span class="faint" style="flex-shrink: 0; margin-top: 0.15rem;">{open === group.id ? '▾' : '▸'}</span>
        <span style="flex: 1;">
          <strong style="display: block;">{group.title}</strong>
          {#if open !== group.id}
            <span class="muted small">{group.intro.split('.')[0]}.</span>
          {/if}
        </span>
        {#if group.priority === 1}
          <span class="tag tag-warn" style="flex-shrink: 0;">first</span>
        {/if}
      </button>

      {#if open === group.id}
        <div style="padding: 0 1.1rem 1.1rem;">
          <p class="muted small" style="margin: 0 0 1rem;">{group.intro}</p>

          {#each group.sounds as note}
            {@const eg = examplesFor(note)}
            <div style="padding: 0.8rem 0; border-top: 1px solid var(--border);">
              <div class="row" style="gap: 0.6rem; align-items: baseline;">
                <strong class="roman-answer" style="font-size: 1.25rem;">{note.roman}</strong>
                {#if showScript}<span class="bn bn-md muted">{note.script}</span>{/if}
                <span class="faint small" style="font-family: ui-monospace, monospace;">/{note.ipa}/</span>
              </div>
              <p class="small" style="margin: 0.35rem 0 0;">{note.tip}</p>
              {#if note.pitfall}
                <p class="small" style="margin: 0.35rem 0 0; color: var(--warn);">
                  ⚠ Common mistake: {note.pitfall}
                </p>
              {/if}
              {#if eg.length}
                <div class="row" style="gap: 0.5rem; margin-top: 0.5rem; flex-wrap: wrap;">
                  {#each eg as e}
                    <button
                      class="small"
                      style="padding: 0.3rem 0.6rem; min-height: auto;"
                      onclick={() => speech.say(e.form, undefined, base)}
                      title="Hear it"
                    >{e.roman} <span class="faint">· {e.gloss}</span></button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/each}

  {#if speech.status === 'none'}
    <p class="faint small center" style="margin: 0;">
      Tapping an example would play it, but this device has no Bangla voice installed.
    </p>
  {/if}
</div>
