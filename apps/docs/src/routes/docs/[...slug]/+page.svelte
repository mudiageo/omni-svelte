<script lang="ts">
	import type { PageData } from './$types.js';
	import { docsNav } from '$lib/docs-nav.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import DocsToc from '$lib/components/docs/docs-toc.svelte';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Pencil from '@lucide/svelte/icons/pencil';

	let { data }: { data: PageData } = $props();
	const doc = $derived(data.doc);

	const allPages = $derived(docsNav.flatMap(s => s.items));
	const currentIdx = $derived(allPages.findIndex(p => p.href?.endsWith(doc.slugAsParams)));
	const prev = $derived(currentIdx > 0 ? allPages[currentIdx - 1] : null);
	const next = $derived(currentIdx < allPages.length - 1 ? allPages[currentIdx + 1] : null);
	const section = $derived(docsNav.find(s => s.items.some(i => i.href?.endsWith(doc.slugAsParams))));
</script>

<svelte:head>
	<title>{doc.title} — OmniSvelte Docs</title>
	{#if doc.description}
		<meta name="description" content={doc.description} />
	{/if}
</svelte:head>

<!-- TOC sits in the right column via xl:grid-cols layout in parent -->
<DocsToc />

<article class="prose-docs min-w-0">
	<!-- Section badge -->
	{#if section}
		<Badge variant="secondary" class="mb-3 text-[11px] uppercase tracking-wider font-semibold">
			{section.title}
		</Badge>
	{/if}

	<!-- Page header -->
	<h1 class="text-3xl font-bold tracking-tight text-foreground mt-1 mb-3">{doc.title}</h1>
	{#if doc.description}
		<p class="text-lg text-muted-foreground leading-relaxed mb-6">{doc.description}</p>
	{/if}
	<Separator class="mb-8" />


	<div class="mdsx">
		<data.component/>
	</div>

	<!-- Pager -->
	<Separator class="mt-10 mb-6" />
	<div class="flex items-stretch justify-between gap-4 not-prose">
		{#if prev?.href}
			<a href={prev.href} class="group flex flex-col gap-1 flex-1 max-w-[48%] rounded-lg border border-border hover:border-violet-300 dark:hover:border-violet-700 p-4 transition-colors">
				<span class="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
					<ChevronLeft class="h-3 w-3" /> Previous
				</span>
				<span class="text-sm font-medium text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight">
					{prev.title}
				</span>
			</a>
		{:else}<div class="flex-1"></div>{/if}

		{#if next?.href}
			<a href={next.href} class="group flex flex-col items-end gap-1 flex-1 max-w-[48%] rounded-lg border border-border hover:border-violet-300 dark:hover:border-violet-700 p-4 transition-colors">
				<span class="flex items-center gap-1 text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">
					Next <ChevronRight class="h-3 w-3" />
				</span>
				<span class="text-sm font-medium text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors leading-tight text-right">
					{next.title}
				</span>
			</a>
		{:else}<div class="flex-1"></div>{/if}
	</div>

	<!-- Edit on GitHub -->
	<div class="mt-6 flex items-center justify-center gap-1.5 not-prose">
		<a
			href="https://github.com/mudiageo/omni-svelte/edit/main/apps/docs/content/docs/{doc.slugAsParams}.md"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
		>
			<Pencil class="h-3 w-3" />
			Edit this page on GitHub
		</a>
	</div>
</article>
