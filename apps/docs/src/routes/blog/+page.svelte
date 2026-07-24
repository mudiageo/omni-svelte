<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator';
	import { SpotlightCard } from '$lib/components/ui/spotlight-card';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import User from '@lucide/svelte/icons/user';
	import Rss from '@lucide/svelte/icons/rss';
	import { formatDate } from '$lib/utils.js';

	let { data } = $props();
	const { posts } = data;

	const featured = posts.find((p) => p.featured);
	const rest = posts.filter((p) => !p.featured);
</script>

<svelte:head>
	<title>Blog — OmniSvelte</title>
	<meta name="description" content="News, deep dives, and updates from the OmniSvelte team." />
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-14 sm:px-6">
	<!-- Header -->
	<div class="mb-12">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<Badge
					variant="outline"
					class="mb-3 border-primary/30 text-primary dark:border-primary/50 dark:text-primary"
				>
					Blog
				</Badge>
				<h1 class="text-4xl font-bold tracking-tight">Latest from OmniSvelte</h1>
				<p class="mt-2 text-lg text-muted-foreground">
					Updates, announcements, and deep dives from the team.
				</p>
			</div>
			<Button variant="outline" size="sm" class="hidden shrink-0 gap-2 sm:inline-flex">
				<Rss class="h-3.5 w-3.5" />
				RSS Feed
			</Button>
		</div>
		<Separator />
	</div>

	<!-- Featured post -->
	{#if featured}
		<SpotlightCard color="rgba(139, 92, 246, 0.08)" size={400} class="mb-10">
			<a href="/blog/{featured.slug}" class="block p-8">
				<div class="mb-4 flex flex-wrap gap-2">
					<Badge variant="default" class="border-0 bg-primary text-primary-foreground"
						>Featured</Badge
					>
					{#each featured.tags as tag}
						<Badge variant="outline" class="text-xs capitalize">{tag}</Badge>
					{/each}
				</div>
				<h2
					class="mb-3 text-2xl font-bold tracking-tight transition-colors group-hover:text-primary sm:text-3xl"
				>
					{featured.title}
				</h2>
				<p class="mb-6 leading-relaxed text-muted-foreground">{featured.description}</p>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="flex items-center gap-4 text-sm text-muted-foreground">
						<span class="flex items-center gap-1.5">
							<User class="h-3.5 w-3.5" />
							{featured.author}
						</span>
						<span class="flex items-center gap-1.5">
							<Calendar class="h-3.5 w-3.5" />
							{formatDate(featured.date)}
						</span>
						<span class="flex items-center gap-1.5">
							<Clock class="h-3.5 w-3.5" />
							5 min read
						</span>
					</div>
					<Button
						variant="ghost"
						size="sm"
						class="gap-1.5 px-0 text-primary hover:text-primary/80 dark:text-primary"
					>
						Read post <ArrowRight class="h-3.5 w-3.5" />
					</Button>
				</div>
			</a>
		</SpotlightCard>
	{/if}

	<!-- Post grid -->
	<div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
		{#each rest as post}
			<a href="/blog/{post.slug}" class="group">
				<Card
					class="h-full transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 dark:hover:border-primary/50"
				>
					<CardHeader class="pb-3">
						<div class="mb-3 flex flex-wrap gap-1.5">
							{#each post.tags as tag}
								<Badge variant="outline" class="h-5 px-1.5 text-[11px] capitalize">{tag}</Badge>
							{/each}
						</div>
						<CardTitle class="text-base leading-snug transition-colors group-hover:text-primary">
							{post.title}
						</CardTitle>
						<CardDescription class="mt-1.5 text-[13px] leading-relaxed"
							>{post.description}</CardDescription
						>
					</CardHeader>
					<CardContent class="pt-0">
						<Separator class="mb-3" />
						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<span class="flex items-center gap-1"
								><Calendar class="h-3 w-3" /> {formatDate(post.date)}</span
							>
							<span class="flex items-center gap-1"><Clock class="h-3 w-3" /> 5 min read</span>
						</div>
					</CardContent>
				</Card>
			</a>
		{/each}
	</div>
</div>
