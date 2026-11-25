<script lang="ts">
	import { siteConfig } from '#lib/config.js';
	import SEO from '#lib/components/seo.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import User from '@lucide/svelte/icons/user';

	import { formatDate } from '#lib/utils.js';

	let { data } = $props();
	const post = $derived(data.post);
	const MarkdownComponent = $derived(data.component);

	const blogJsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.description,
		author: {
			'@type': 'Person',
			name: post.author
		},
		datePublished: post.date,
		url: `${siteConfig.url}/blog/${post.slugAsParams}`
	});
</script>

<SEO
	title={post.title}
	description={post.description}
	canonical={`${siteConfig.url}/blog/${post.slugAsParams}`}
	ogType="article"
	article={{
		publishedTime: post.date,
		author: post.author,
		tags: post.tags
	}}
	breadcrumbs={[
		{ name: 'Blog', item: '/blog' },
		{ name: post.title, item: `/blog/${post.slugAsParams}` }
	]}
	jsonLd={blogJsonLd}
/>

<div class="container mx-auto max-w-3xl px-4 py-14 sm:px-6">
	<Button
		href="/blog"
		variant="ghost"
		size="sm"
		class="text-muted-foreground hover:text-foreground mb-8 -ml-2 gap-1.5"
	>
		<ArrowLeft class="h-3.5 w-3.5" />
		All posts
	</Button>

	<article>
		<header class="mb-8">
			<div class="mb-4 flex flex-wrap gap-2">
				{#each post.tags as tag}
					<Badge variant="outline" class="capitalize">{tag}</Badge>
				{/each}
			</div>
			<h1 class="mb-4 text-4xl leading-tight font-bold tracking-tight">{post.title}</h1>
			<p class="text-muted-foreground mb-6 text-xl leading-relaxed">{post.description}</p>
			<div class="text-muted-foreground flex items-center gap-5 text-sm">
				<span class="flex items-center gap-1.5"><User class="h-4 w-4" />{post.author}</span>
				<span class="flex items-center gap-1.5"
					><Calendar class="h-4 w-4" />{formatDate(post.date)}</span
				>
				<span class="flex items-center gap-1.5"><Clock class="h-4 w-4" />5 min read</span>
			</div>
			<Separator class="mt-6" />
		</header>

		<div class="prose-docs">
			<MarkdownComponent />
		</div>
	</article>
</div>
