<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {Badge} from '$lib/components/ui/badge';
	import {Separator} from '$lib/components/ui/separator';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Clock from '@lucide/svelte/icons/clock';
  import User from '@lucide/svelte/icons/user';
	import { page } from '$app/state';

	// In production this comes from velite
	const post = {
		title: 'Introducing OmniSvelte: SvelteKit with Superpowers',
		description: "We're thrilled to announce OmniSvelte — a batteries-included meta-framework built on SvelteKit.",
		date: '2025-06-01',
		author: 'Mudia',
		tags: ['announcement', 'release'],
		readTime: '5 min read'
	};
</script>

<svelte:head>
	<title>{post.title} — OmniSvelte Blog</title>
	<meta name="description" content={post.description} />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 sm:px-6 py-14">
	<Button href="/blog" variant="ghost" size="sm" class="mb-8 gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
		<ArrowLeft class="h-3.5 w-3.5" />
		All posts
	</Button>

	<article>
		<header class="mb-8">
			<div class="flex flex-wrap gap-2 mb-4">
				{#each post.tags as tag}
					<Badge variant="outline" class="capitalize">{tag}</Badge>
				{/each}
			</div>
			<h1 class="text-4xl font-bold tracking-tight mb-4 leading-tight">{post.title}</h1>
			<p class="text-xl text-muted-foreground leading-relaxed mb-6">{post.description}</p>
			<div class="flex items-center gap-5 text-sm text-muted-foreground">
				<span class="flex items-center gap-1.5"><User class="h-4 w-4" />{post.author}</span>
				<span class="flex items-center gap-1.5"><Calendar class="h-4 w-4" />{post.date}</span>
				<span class="flex items-center gap-1.5"><Clock class="h-4 w-4" />{post.readTime}</span>
			</div>
			<Separator class="mt-6" />
		</header>

		<div class="prose-docs">
			<p>Full blog post content would be rendered mdsx.</p>
			<p>This is a placeholder page. In the real site, each blog post file in <code>content/blog/</code> is processed by velite and rendered via the mdsx preprocessor.</p>
		</div>
	</article>
</div>
