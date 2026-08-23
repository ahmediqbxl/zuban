<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { session } from '$ui/session.svelte';

  let { children } = $props();

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
