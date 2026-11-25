<script lang="ts">
	import type { PageData } from './$types.js';
	import { docsNav } from '#lib/docs-nav.js';
	import { siteConfig } from '#lib/config.js';
	import SEO from '#lib/components/seo.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import DocsToc from '#lib/components/docs/docs-toc.svelte';
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

	const docJsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'TechArticle',
		headline: doc.title,
		description: doc.description || `${doc.title} documentation for OmniSvelte`,
		url: `${siteConfig.url}/docs/${doc.slugAsParams}`
	});

	const breadcrumbs = $derived([
		{ name: 'Docs', item: '/docs' },
		...(section ? [{ name: section.title, item: section.items[0]?.href || '/docs' }] : []),
		{ name: doc.title, item: `/docs/${doc.slugAsParams}` }
	]);
</script>

<SEO
	title={doc.title}
	description={doc.description}
	canonical={`${siteConfig.url}/docs/${doc.slugAsParams}`}
	ogType="article"
	{breadcrumbs}
	jsonLd={docJsonLd}
/>

<div class="xl:grid xl:grid-cols-[1fr_220px] xl:gap-10">
	<article class="prose-docs min-w-0">
		<!-- Section badge -->
		{#if section}
			<Badge variant="secondary" class="mb-3 text-[11px] font-semibold tracking-wider uppercase">
				{section.title}
			</Badge>
		{/if}

		<!-- Page header -->
		<h1 class="text-foreground mt-1 mb-3 text-3xl font-bold tracking-tight">{doc.title}</h1>
		{#if doc.description}
			<p class="text-muted-foreground mb-6 text-lg leading-relaxed">{doc.description}</p>
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
					class="group border-border hover:border-primary/50 flex max-w-[48%] flex-1 flex-col gap-1 rounded-lg border p-4 transition-colors"
				>
					<span
						class="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase"
					>
						<ChevronLeft class="h-3 w-3" /> Previous
					</span>
					<span
						class="text-foreground group-hover:text-primary text-sm leading-tight font-medium transition-colors"
					>
						{prev.title}
					</span>
				</a>
			{:else}<div class="flex-1"></div>{/if}

			{#if next?.href}
				<a
					href={next.href}
					class="group border-border hover:border-primary/50 flex max-w-[48%] flex-1 flex-col items-end gap-1 rounded-lg border p-4 transition-colors"
				>
					<span
						class="text-muted-foreground flex items-center gap-1 text-[11px] font-semibold tracking-wide uppercase"
					>
						Next <ChevronRight class="h-3 w-3" />
					</span>
					<span
						class="text-foreground group-hover:text-primary text-right text-sm leading-tight font-medium transition-colors"
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
				class="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs transition-colors"
			>
				<Pencil class="h-3 w-3" />
				Edit this page on GitHub
			</a>
		</div>
	</article>

	<div class="hidden xl:block">
		<DocsToc />
	</div>
</div>
