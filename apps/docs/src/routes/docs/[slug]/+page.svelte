<script lang="ts">
	import type { PageData } from './$types';
	import { flattenNav, nav } from '$lib/nav';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { page } from '$app/stores';

	let { data }: { data: PageData } = $props();

	const flat = flattenNav(nav);
	const currentSlug = $derived($page.params.slug);
	const currentIdx = $derived(flat.findIndex((n) => n.slug === currentSlug));
	const prev = $derived(flat[currentIdx - 1]);
	const next = $derived(flat[currentIdx + 1]);
</script>

<svelte:head>
	<title>{data.meta?.title ?? 'Docs'} — omni-svelte</title>
</svelte:head>

<article class="prose prose-slate max-w-3xl dark:prose-invert prose-headings:scroll-mt-20 prose-code:before:content-none prose-code:after:content-none">
	<svelte:component this={data.content} />
</article>

<!-- Prev / next navigation -->
{#if prev || next}
	<nav class="mt-16 flex items-center justify-between border-t border-slate-200 pt-8 dark:border-slate-800">
		{#if prev}
			<a
				href="/docs/{prev.slug}"
				class="group flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
			>
				<ChevronLeft class="h-4 w-4 transition group-hover:-translate-x-0.5" />
				<span>
					<span class="block text-xs text-slate-400">Previous</span>
					{prev.title}
				</span>
			</a>
		{:else}
			<div></div>
		{/if}

		{#if next}
			<a
				href="/docs/{next.slug}"
				class="group flex items-center gap-2 text-right text-sm font-medium text-slate-600 transition hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
			>
				<span>
					<span class="block text-xs text-slate-400">Next</span>
					{next.title}
				</span>
				<ChevronRight class="h-4 w-4 transition group-hover:translate-x-0.5" />
			</a>
		{/if}
	</nav>
{/if}
