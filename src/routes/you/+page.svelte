<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { session, course } from '$ui/session.svelte';
  import { TRACKS } from '$engine/sequencer';
  import { auth } from '$db/auth.svelte';
  import { install } from '$ui/install.svelte';
  import { projectWeeksTo } from '$ui/stats';
  import { env } from '$env/dynamic/public';

  let email = $state('');
  let confirmReset = $state(false);

  onMount(() => {
    if (!session.ready) session.load();
    auth.init();
    install.init();
  });

  const stats = $derived(session.stats);
  const weeks = $derived(projectWeeksTo(0.8, session.coverage, stats.velocity));
  const pct = (x: number) => Math.round(x * 100);

  async function reset() {
    await session.reset();
    confirmReset = false;
  }
</script>

<header style="margin: 1.4rem 0 1.5rem;">
  <h1 style="margin: 0; font-size: 1.5rem;">You</h1>
  <p class="muted small" style="margin: 0.2rem 0 0;">Progress, reminders, and your account.</p>
</header>

<div class="stack">

  <!-- ── Progress ─────────────────────────────────────────────── -->
  <section class="card">
    <div class="spread" style="margin-bottom: 0.8rem;">
      <span class="muted small">Everyday Bangla you can follow</span>
      <strong style="font-size: 1.3rem;">{pct(session.coverage)}%</strong>
    </div>
    <div class="meter"><i style="width: {pct(session.coverage)}%"></i></div>
    {#if weeks !== null}
      <p class="faint small" style="margin: 0.7rem 0 0;">
        At your current pace, about <strong>{weeks} {weeks === 1 ? 'week' : 'weeks'}</strong> to 80%.
        That's an extrapolation, not a promise.
      </p>
    {:else if stats.daysStudied > 1}
      <p class="faint small" style="margin: 0.7rem 0 0;">Not enough recent activity to project a pace.</p>
    {/if}
  </section>

  <div class="stat-row">
    <section class="card">
      <div class="muted small">Days studied</div>
      <strong>{stats.daysStudied}</strong>
    </section>
    <section class="card">
      <div class="muted small">Cards answered</div>
      <strong>{stats.itemsTotal}</strong>
    </section>
    <section class="card">
      <div class="muted small">Accuracy</div>
      <strong>{pct(stats.accuracy)}%</strong>
    </section>
  </div>

  {#if stats.velocity > 0}
    <p class="muted small" style="margin: 0;">
      Gaining about <strong>{stats.velocity.toFixed(1)} points</strong> of comprehension per week.
    </p>
  {/if}

  <!-- ── Goal ─────────────────────────────────────────────────── -->
  <section class="card">
    <h3 style="margin: 0 0 0.4rem; font-size: 1rem;">Your goal</h3>
    <p class="muted small" style="margin: 0 0 0.8rem;">
      {#if session.track.script}
        Speaking and reading. You'll learn the script inside real words.
      {:else}
        Speaking only. Everything is written the way it sounds, and you never
        have to read Bangla script.
      {/if}
    </p>
    <button
      style="width: 100%;"
      onclick={() => session.setTrack(session.track.script ? TRACKS.speaking : TRACKS.both)}
    >
      {session.track.script ? 'Switch to speaking only' : 'Add reading and writing'}
    </button>
    <p class="faint small" style="margin: 0.6rem 0 0;">
      Switching keeps everything you've learned — it only changes which
      exercises you get from here.
    </p>
  </section>

  <!-- ── Placement ────────────────────────────────────────────── -->
  <section class="card">
    <div class="spread">
      <div>
        <div class="muted small">Starting point</div>
        <strong>{session.placementLabel ?? 'Not set'}</strong>
      </div>
      <a class="btn small" href="{base}/placement" style="text-decoration: none; display: grid; place-items: center;">
        {session.placed ? 'Retake' : 'Take test'}
      </a>
    </div>
  </section>

  <!-- ── Reminders ────────────────────────────────────────────── -->
  <section class="card">
    <h3 style="margin: 0 0 0.4rem; font-size: 1rem;">Reminders</h3>
    <p class="muted small" style="margin: 0 0 0.8rem;">
      A nudge when cards are due for review. No streaks, no guilt — just
      whether something is actually slipping.
    </p>

    {#if install.platform === 'ios-safari'}
      <p class="banner" style="margin-bottom: 0.7rem;">
        On iPhone, tap <strong>Share → Add to Home Screen</strong> first.
        iOS only allows notifications for installed web apps.
      </p>
    {:else if install.platform === 'prompt-capable'}
      <button onclick={() => install.promptInstall()} style="width: 100%; margin-bottom: 0.6rem;">
        Install Zuban
      </button>
    {:else if install.platform === 'installed'}
      <p class="muted small" style="margin: 0 0 0.7rem;">✓ Installed</p>
    {/if}

    {#if install.pushPermission === 'granted'}
      <div class="row" style="gap: 0.5rem;">
        <span class="tag" style="flex-shrink: 0;">On</span>
        <button class="small" onclick={() => install.testNotification(session.dueCount)} style="flex: 1;">
          Send a test
        </button>
      </div>
    {:else if install.pushPermission === 'denied'}
      <p class="muted small" style="margin: 0;">
        Blocked. Re-enable notifications for this site in your browser settings.
      </p>
    {:else if install.pushPermission !== 'unsupported'}
      <button onclick={() => install.enableNotifications(env.PUBLIC_VAPID_KEY)} style="width: 100%;">
        Turn on reminders
      </button>
    {:else}
      <p class="muted small" style="margin: 0;">This browser doesn't support notifications.</p>
    {/if}

    {#if install.message}
      <p class="faint small" style="margin: 0.6rem 0 0;">{install.message}</p>
    {/if}
  </section>

  <!-- ── Account ──────────────────────────────────────────────── -->
  <section class="card">
    <h3 style="margin: 0 0 0.4rem; font-size: 1rem;">Account</h3>

    {#if auth.state === 'unconfigured'}
      <p class="muted small" style="margin: 0;">
        Syncing isn't set up on this build. Your progress is saved on this
        device and works completely offline.
      </p>
    {:else if auth.state === 'signed-in'}
      <p class="muted small" style="margin: 0 0 0.7rem;">
        Signed in as <strong>{auth.user?.email}</strong>.
        {#if auth.lastSync}Last synced {new Date(auth.lastSync).toLocaleTimeString()}.{/if}
      </p>
      <div class="row" style="gap: 0.5rem;">
        <button class="small" onclick={() => auth.runSync(course.meta.code)} disabled={auth.syncing} style="flex: 1;">
          {auth.syncing ? 'Syncing…' : 'Sync now'}
        </button>
        <button class="small" onclick={() => auth.signOut()} style="flex: 1;">Sign out</button>
      </div>
    {:else if auth.state === 'sent'}
      <p class="muted small" style="margin: 0;">{auth.message}</p>
    {:else}
      <p class="muted small" style="margin: 0 0 0.7rem;">
        Optional. Sign in only if you want your progress to survive a lost phone —
        everything works without an account.
      </p>
      <form onsubmit={(e) => { e.preventDefault(); auth.signIn(email); }}>
        <input
          type="email"
          bind:value={email}
          placeholder="you@example.com"
          required
          autocomplete="email"
          style="width: 100%; min-height: var(--tap); padding: 0.7rem 0.9rem; margin-bottom: 0.6rem;
                 border-radius: var(--radius-sm); border: 1px solid var(--border);
                 background: var(--surface-2); color: var(--text); font: inherit;"
        />
        <button class="btn-primary" type="submit" style="width: 100%;">Email me a sign-in link</button>
      </form>
      {#if auth.state === 'error' && auth.message}
        <p class="small" style="color: var(--bad); margin: 0.6rem 0 0;">{auth.message}</p>
      {/if}
    {/if}
  </section>

  <!-- ── Reset ────────────────────────────────────────────────── -->
  <section class="card">
    <h3 style="margin: 0 0 0.4rem; font-size: 1rem;">Start over</h3>
    <p class="muted small" style="margin: 0 0 0.8rem;">
      Erases all progress on this device: review history, placement, and statistics.
    </p>
    {#if confirmReset}
      <div class="row" style="gap: 0.5rem;">
        <button onclick={reset} style="flex: 1; border-color: var(--bad); color: var(--bad);">
          Yes, erase everything
        </button>
        <button onclick={() => (confirmReset = false)} style="flex: 1;">Cancel</button>
      </div>
    {:else}
      <button onclick={() => (confirmReset = true)} style="width: 100%;">Reset progress</button>
    {/if}
  </section>

  <p class="faint small center" style="margin: 0.5rem 0 0;">
    {course.meta.nativeName} · {course.lexemes.length} words · {course.sentences.length} sentences
  </p>
</div>
