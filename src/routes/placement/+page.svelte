<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import { course, session, SHOW_DRAFTS } from '$ui/session.svelte';
  import { buildProbes, scorePlacement, presentOptions, type PlacementResult } from '$engine/placement';

  // A learner who is not studying the script gets comprehension probes
  // only — asking them to decode Bangla would measure something they have
  // explicitly said they do not want.
  const speakingOnly = $derived(session.placed && !session.track.script);
  const probes = buildProbes(course).filter((p) => !speakingOnly || p.axis !== 'script');
  let step = $state(-1); // -1 = intro
  let responses = $state<Record<string, number>>({});
  let result = $state<PlacementResult | null>(null);
  let saving = $state(false);

  onMount(() => { if (!session.ready) session.load(); });

  const probe = $derived(step >= 0 && step < probes.length ? probes[step] : null);
  const options = $derived(probe ? presentOptions(probe) : []);
  const usingAudio = $derived(probes.some((p) => p.axis === 'listening' && p.prompt.audio));

  function answer(optionIndex: number) {
    if (!probe) return;
    // presentOptions rotates, so map the displayed position back to the
    // probe's own option order before recording it.
    const chosen = options[optionIndex];
    responses[probe.id] = probe.options.indexOf(chosen.text);
    if (step + 1 < probes.length) {
      step += 1;
    } else {
      result = scorePlacement(course, probes, responses);
      step = probes.length;
    }
  }

  function skip() {
    // Skipping is scored as "did not know it" rather than being dropped,
    // so an unanswered probe never inflates the placement.
    if (!probe) return;
    responses[probe.id] = -1;
    if (step + 1 < probes.length) step += 1;
    else { result = scorePlacement(course, probes, responses); step = probes.length; }
  }

  async function accept() {
    if (!result) return;
    saving = true;
    await session.setTrack(result.track, {
      listening: result.listening,
      script: result.script,
      label: result.label
    });
    await session.seedKnown(result.known);
    await goto(`${base}/learn`);
  }

  const BLURB: Record<PlacementResult['label'], { title: string; body: string }> = {
    heritage: {
      title: 'You understand Bangla but don’t read it',
      body: 'The most common starting point for people who grew up hearing Bangla at home. We’ll skip the vocabulary drills you don’t need and go straight at the script.'
    },
    beginner: {
      title: 'Starting from the beginning',
      body: 'You’ll build the script and the vocabulary together, one letter and one word at a time, always inside real sentences.'
    },
    literate: {
      title: 'You can read, but the spoken language is new',
      body: 'Usually means formal study. We’ll lean on listening and everyday phrasing rather than making you re-learn letters you already know.'
    },
    intermediate: {
      title: 'You already have both',
      body: 'You’ll start further in, on sentences and the conjuncts that trip up most readers.'
    }
  };
</script>

{#if step === -1}
  <!-- Intro -->
  <div style="margin: 2rem 0 1.6rem;">
    <span class="tag">{probes.length} questions · about a minute</span>
    <h1 style="font-size: 1.6rem; margin: 0.7rem 0 0.6rem;">Where should we start you?</h1>
    <p class="muted" style="margin: 0;">
      Two separate things get measured: whether you <strong>understand</strong> Bangla,
      and whether you can <strong>read</strong> it. Plenty of people have one without the
      other, so we ask about them separately instead of assuming.
    </p>
  </div>

  {#if !usingAudio}
    <p class="banner" style="margin-bottom: 1rem;">
      Audio isn't recorded yet, so comprehension is tested using romanized
      Bangla — <em>ami bhalo achhi</em> rather than a recording.
    </p>
  {/if}

  <div class="stack">
    <button class="btn-primary" onclick={() => (step = 0)}>Start</button>
    <a class="btn center" href="{base}/learn" style="text-decoration: none; display: grid; place-items: center;">
      Skip — just start at the beginning
    </a>
  </div>

{:else if probe}
  <!-- Probe -->
  <div class="spread" style="margin: 1rem 0 1.2rem;">
    <span class="tag">{probe.axis === 'script' ? 'Reading' : 'Understanding'}</span>
    <span class="faint small">{step + 1} of {probes.length}</span>
  </div>
  <div class="meter" style="margin-bottom: 1.3rem;">
    <i style="width: {((step) / probes.length) * 100}%"></i>
  </div>

  <div class="card">
    <p class="muted small" style="margin: 0 0 0.9rem;">
      {probe.axis === 'script' ? 'How is this word read aloud?' : 'What does this mean?'}
    </p>
    {#if probe.prompt.audio}
      <audio controls src={probe.prompt.audio} style="width: 100%;"></audio>
    {:else if probe.axis === 'script'}
      <p class="bn bn-display" style="margin: 0;">{probe.prompt.text}</p>
    {:else}
      <p style="margin: 0; font-size: 1.35rem; font-style: italic;">{probe.prompt.text}</p>
    {/if}
  </div>

  <!-- data-answer is a dev-only end-to-end test hook, absent in production. -->
  <div style="margin-top: 1rem;" data-answer={SHOW_DRAFTS ? probe.options[probe.answer] : undefined}>
    {#each options as option, i}
      <button class="choice" onclick={() => answer(i)}>{option.text}</button>
    {/each}
    <button class="choice faint" onclick={skip} style="text-align: center;">I don't know</button>
  </div>

{:else if result}
  <!-- Result -->
  <div style="margin: 2rem 0 1.4rem;">
    <span class="tag">Result</span>
    <h1 style="font-size: 1.45rem; margin: 0.7rem 0 0.5rem;">{BLURB[result.label].title}</h1>
    <p class="muted" style="margin: 0;">{BLURB[result.label].body}</p>
  </div>

  <div class="row" style="gap: 0.85rem; margin-bottom: 1rem;">
    <section class="card" style="flex: 1;">
      <div class="muted small">Understanding</div>
      <strong style="font-size: 1.3rem;">{result.listening.toFixed(1)}<span class="faint" style="font-size: 0.9rem;">/5</span></strong>
      <div class="meter" style="margin-top: 0.5rem;"><i style="width: {(result.listening / 5) * 100}%"></i></div>
    </section>
    <section class="card" style="flex: 1;">
      <div class="muted small">Reading</div>
      <strong style="font-size: 1.3rem;">{result.script.toFixed(1)}<span class="faint" style="font-size: 0.9rem;">/5</span></strong>
      <div class="meter" style="margin-top: 0.5rem;"><i style="width: {(result.script / 5) * 100}%"></i></div>
    </section>
  </div>

  {#if result.known.lexemes.size > 0}
    <p class="muted small" style="margin: 0 0 1rem;">
      Crediting you with <strong>{result.known.lexemes.size}</strong> words you already showed you know{#if result.known.glyphs.size > 0}, and <strong>{result.known.glyphs.size}</strong> letters{/if}.
      {#if result.known.glyphs.size === 0 && result.known.lexemes.size > 0}
        Understanding a word proves the vocabulary, not the spelling — so the letters still start from scratch.
      {/if}
    </p>
  {/if}

  <div class="stack">
    <button class="btn-primary" onclick={accept} disabled={saving}>
      {saving ? 'Saving…' : 'Start here'}
    </button>
    <button onclick={() => { step = -1; responses = {}; result = null; }}>Take it again</button>
  </div>
{/if}
