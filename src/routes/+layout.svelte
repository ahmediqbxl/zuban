<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { session, course } from '$ui/session.svelte';
  import { auth } from '$db/auth.svelte';

  let { children } = $props();

  // Auth lives at the layout, not the You page: a magic-link redirect lands
  // on `/`, and the Supabase client only consumes the token in the URL when
  // it is created. Initialised only from the You page, sign-in appeared to
  // do nothing unless you happened to navigate there afterwards.
  onMount(() => {
    auth.init();
  });

  // Sync without a button. Once on sign-in (which is also every app open,
  // via INITIAL_SESSION), and again whenever a lesson ends — never on the
  // card-answer path, and runSync itself never throws.
  $effect(() => {
    if (auth.state === 'signed-in') void auth.runSync(course.meta.code);
  });

  let lastPath = '';
  $effect(() => {
    const path = $page.url.pathname;
    const leftLesson = lastPath.includes('/learn') && !path.includes('/learn');
    lastPath = path;
    if (leftLesson && auth.state === 'signed-in') void auth.runSync(course.meta.code);
  });

  // The Script tab is the font-rendering check. It is meaningless — and a
  // little discouraging — for someone who has said they do not want to
  // read Bangla, so it is hidden unless the script is part of their goal.
  const tabs = $derived([
    { href: '/', label: 'Today' },
    { href: '/learn', label: 'Learn' },
    // Script learners get the font-rendering check; speaking learners get
    // the pronunciation guide, which is the equivalent reference for them.
    session.track.script
      ? { href: '/script', label: 'Script' }
      : { href: '/sounds', label: 'Sounds' },
    { href: '/you', label: 'You' }
  ]);

  const isCurrent = (href: string, path: string) =>
    href === '/' ? path === base + '/' || path === base : path.startsWith(base + href);
</script>

{#if !isCurrent('/', $page.url.pathname)}
  <!-- Always-visible way home. The bottom tabs technically cover this,
       but they are easy to miss and iOS Safari's floating toolbar can sit
       on top of them; a wordmark that goes home is the affordance every
       site trains people to expect. -->
  <header class="appbar">
    <a href="{base}/" aria-label="Back to home">zuban</a>
  </header>
{/if}

<div class="shell">
  {@render children()}
</div>

<nav class="tabs">
  {#each tabs as tab}
    <a
      href="{base}{tab.href}"
      aria-current={isCurrent(tab.href, $page.url.pathname) ? 'page' : undefined}
    >{tab.label}</a>
  {/each}
</nav>
