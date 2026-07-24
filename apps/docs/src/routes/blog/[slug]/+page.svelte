<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import User from '@lucide/svelte/icons/user';

	import { formatDate } from '$lib/utils.js';

	let { data } = $props();
	const { post, component: MarkdownComponent } = data;
</script>

<svelte:head>
	<title>{post.title} — OmniSvelte Blog</title>
	<meta name="description" content={post.description} />
</svelte:head>

<div class="container mx-auto max-w-3xl px-4 py-14 sm:px-6">
	<Button
		href="/blog"
		variant="ghost"
		size="sm"
		class="mb-8 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
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
			<p class="mb-6 text-xl leading-relaxed text-muted-foreground">{post.description}</p>
			<div class="flex items-center gap-5 text-sm text-muted-foreground">
				<span class="flex items-center gap-1.5"><User class="h-4 w-4" />{post.author}</span>
				<span class="flex items-center gap-1.5"><Calendar class="h-4 w-4" />{formatDate(post.date)}</span>
				<span class="flex items-center gap-1.5"><Clock class="h-4 w-4" />5 min read</span>
			</div>
			<Separator class="mt-6" />
		</header>

		<div class="prose-docs">
			<MarkdownComponent />
		</div>
	</article>
</div>
