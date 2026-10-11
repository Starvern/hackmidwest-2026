<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  let { intake = false, workspaceHref = '/' }: { intake?: boolean; workspaceHref?: string } = $props();
  const links = $derived([
    { label: 'Businesses', href: '/intake#businesses' },
    { label: 'Import company', href: '/intake#import' },
    { label: 'Plan builder', href: `${intake ? workspaceHref : ''}#plans` },
    { label: 'Results', href: `${intake ? workspaceHref : ''}#outcomes` },
    { label: 'Risk', href: `${intake ? workspaceHref : ''}#risk` },
    { label: 'Assumptions', href: `${intake ? workspaceHref : ''}#assumptions` },
  ]);
  function isCurrent(href: string) {
    const target = new URL(href, page.url.href);
    return target.pathname === page.url.pathname && target.search === page.url.search && target.hash === page.url.hash;
  }
  function reveal(href: string) {
    const target = new URL(href, page.url.href);
    if (target.pathname !== page.url.pathname || target.search !== page.url.search || target.hash !== '#assumptions') return;
    const section = document.getElementById(target.hash.slice(1));
    const details = section instanceof HTMLDetailsElement ? section : section?.querySelector('details');
    if (details) details.open = true;
  }
  onMount(() => reveal(page.url.href));
</script>

<aside class="sidebar" aria-label="Workspace navigation">
  <a class="sidebar-brand" href="/" aria-label="Sapling home"><img src="/brand/sapling-logo.png" alt="Sapling" /></a>
  <nav aria-label="Workspace sections">
    {#each links as link}<a href={link.href} aria-current={isCurrent(link.href) ? 'location' : undefined} onclick={() => reveal(link.href)}>{link.label}</a>{/each}
  </nav>
</aside>

<style>
  .sidebar{width:176px;flex-shrink:0;background:#173d37;color:#dce8e1;padding:24px 14px;position:sticky;top:0;height:100dvh;overflow-y:auto}
  .sidebar-brand{display:block;background:#f3f5f2;border-radius:9px;padding:8px;margin-bottom:28px}
  .sidebar-brand img{display:block;width:100%;height:44px;object-fit:contain}
  nav{display:grid;gap:6px}nav a{display:block;padding:12px 10px;border-radius:7px;text-decoration:none;font-size:13px;line-height:1.3}
  nav a:hover,nav a[aria-current]{background:#31594f;color:white}
  @media(max-width:800px){.sidebar{width:100%;height:auto;position:sticky;z-index:5;padding:10px 12px;overflow:visible}.sidebar-brand{display:none}nav{display:flex;overflow-x:auto;gap:4px}nav a{white-space:nowrap;padding:9px 12px;font-size:12px}}
</style>
