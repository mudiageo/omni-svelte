<script lang="ts">
	import './layout.css';
	import TailwindIndicator from '$lib/components/tailwind-indicator.svelte';
	import { ModeWatcher } from 'mode-watcher';
	import Navbar from '$lib/components/navbar.svelte';
	import Footer from '$lib/components/footer.svelte';
	import Banner from '$lib/components/banner.svelte';
	import { page } from '$app/state';

	let { children } = $props();

	const isDocs = $derived(page.url.pathname.startsWith('/docs'));
	const isBlog = $derived(page.url.pathname.startsWith('/blog'));
</script>

<svelte:head>
	<meta name="theme-color" content="#7c3aed" />
</svelte:head>

<TailwindIndicator />
<ModeWatcher defaultMode="system" />
<div class="relative flex min-h-svh flex-col bg-background">
	<Banner />
	<Navbar />
	<main class="flex-1">
		{@render children()}
	</main>
	{#if !isDocs}
		<Footer />
	{/if}
</div>
