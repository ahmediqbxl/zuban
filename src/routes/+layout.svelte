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
    ...(session.track.script ? [{ href: '/script', label: 'Script' }] : []),
    { href: '/you', label: 'You' }
  ]);

  const isCurrent = (href: string, path: string) =>
    href === '/' ? path === base + '/' || path === base : path.startsWith(base + href);
</script>

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
