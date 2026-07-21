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

	const allPages = $derived(docsNav.flatMap((s) => s.items));
	const currentIdx = $derived(allPages.findIndex((p) => p.href?.endsWith(doc.slugAsParams)));
	const prev = $derived(currentIdx > 0 ? allPages[currentIdx - 1] : null);
	const next = $derived(currentIdx < allPages.length - 1 ? allPages[currentIdx + 1] : null);
	const section = $derived(
		docsNav.find((s) => s.items.some((i) => i.href?.endsWith(doc.slugAsParams)))
	);
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
		<Badge variant="secondary" class="mb-3 text-[11px] font-semibold tracking-wider uppercase">
			{section.title}
		</Badge>
	{/if}

	<!-- Page header -->
	<h1 class="mt-1 mb-3 text-3xl font-bold tracking-tight text-foreground">{doc.title}</h1>
	{#if doc.description}
		<p class="mb-6 text-lg leading-relaxed text-muted-foreground">{doc.description}</p>
	{/if}
	<Separator class="mb-8" />

	<div class="mdsx">
		<data.component />
	</div>

	<!-- Pager -->
	<Separator class="mt-10 mb-6" />
	<div class="not-prose flex items-stretch justify-between gap-4">
		{#if prev?.href}
			<a
				href={prev.href}
				class="group flex max-w-[48%] flex-1 flex-col gap-1 rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
			>
				<span
					class="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
				>
					<ChevronLeft class="h-3 w-3" /> Previous
				</span>
				<span
					class="text-sm leading-tight font-medium text-foreground transition-colors group-hover:text-primary"
				>
					{prev.title}
				</span>
			</a>
		{:else}<div class="flex-1"></div>{/if}

		{#if next?.href}
			<a
				href={next.href}
				class="group flex max-w-[48%] flex-1 flex-col items-end gap-1 rounded-lg border border-border p-4 transition-colors hover:border-primary/50"
			>
				<span
					class="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
				>
					Next <ChevronRight class="h-3 w-3" />
				</span>
				<span
					class="text-right text-sm leading-tight font-medium text-foreground transition-colors group-hover:text-primary"
				>
					{next.title}
				</span>
			</a>
		{:else}<div class="flex-1"></div>{/if}
	</div>

	<!-- Edit on GitHub -->
	<div class="not-prose mt-6 flex items-center justify-center gap-1.5">
		<a
			href="https://github.com/mudiageo/omni-svelte/edit/main/apps/docs/content/docs/{doc.slugAsParams}.md"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
		>
			<Pencil class="h-3 w-3" />
			Edit this page on GitHub
		</a>
	</div>
</article>
