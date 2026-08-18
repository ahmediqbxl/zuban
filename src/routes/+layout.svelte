<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { base } from '$app/paths';

  let { children } = $props();

  const tabs = [
    { href: '/', label: 'Today' },
    { href: '/learn', label: 'Learn' },
    { href: '/script', label: 'Script' },
    { href: '/you', label: 'You' }
  ];

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
