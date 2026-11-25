<script lang="ts">
	import { siteConfig } from '#lib/config.js';
	import SEO from '#lib/components/seo.svelte';
	import { Button } from '#lib/components/ui/button/index.js';
	import { Badge } from '#lib/components/ui/badge/index.js';
	import {
		Card,
		CardContent,
		CardHeader,
		CardTitle,
		CardDescription
	} from '#lib/components/ui/card/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import { SpotlightCard } from '#lib/components/ui/spotlight-card/index.js';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Calendar from '@lucide/svelte/icons/calendar';
	import Clock from '@lucide/svelte/icons/clock';
	import User from '@lucide/svelte/icons/user';
	import Rss from '@lucide/svelte/icons/rss';
	import { formatDate } from '#lib/utils.js';

	let { data } = $props();
	const posts = $derived(data.posts);

	const featured = $derived(posts.find((p) => p.featured) ?? posts[0]);
	const rest = $derived(posts.filter((p) => p.slug !== featured?.slug));
</script>

<SEO
	title="Blog — OmniSvelte"
	description="News, deep dives, and announcements from the OmniSvelte team."
	canonical={`${siteConfig.url}/blog`}
/>

<div class="container mx-auto max-w-5xl px-4 py-14 sm:px-6">
	<!-- Header -->
	<div class="mb-12">
		<div class="mb-4 flex items-center justify-between">
			<div>
				<Badge
					variant="outline"
					class="border-primary/30 text-primary dark:border-primary/50 dark:text-primary mb-3"
				>
					Blog
				</Badge>
				<h1 class="text-4xl font-bold tracking-tight">Latest from OmniSvelte</h1>
				<p class="text-muted-foreground mt-2 text-lg">
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
			<a href="/{featured.slug}" class="block p-8">
				<div class="mb-4 flex flex-wrap gap-2">
					<Badge variant="default" class="bg-primary text-primary-foreground border-0"
						>Featured</Badge
					>
					{#each featured.tags as tag}
						<Badge variant="outline" class="text-xs capitalize">{tag}</Badge>
					{/each}
				</div>
				<h2
					class="group-hover:text-primary mb-3 text-2xl font-bold tracking-tight transition-colors sm:text-3xl"
				>
					{featured.title}
				</h2>
				<p class="text-muted-foreground mb-6 leading-relaxed">{featured.description}</p>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<div class="text-muted-foreground flex items-center gap-4 text-sm">
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
						class="text-primary hover:text-primary/80 dark:text-primary gap-1.5 px-0"
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
			<a href="/{post.slug}" class="group">
				<Card
					class="hover:border-primary/30 hover:shadow-primary/5 dark:hover:border-primary/50 h-full transition-all duration-200 hover:shadow-md"
				>
					<CardHeader class="pb-3">
						<div class="mb-3 flex flex-wrap gap-1.5">
							{#each post.tags as tag}
								<Badge variant="outline" class="h-5 px-1.5 text-[11px] capitalize">{tag}</Badge>
							{/each}
						</div>
						<CardTitle class="group-hover:text-primary text-base leading-snug transition-colors">
							{post.title}
						</CardTitle>
						<CardDescription class="mt-1.5 text-[13px] leading-relaxed"
							>{post.description}</CardDescription
						>
					</CardHeader>
					<CardContent class="pt-0">
						<Separator class="mb-3" />
						<div class="text-muted-foreground flex items-center justify-between text-xs">
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
