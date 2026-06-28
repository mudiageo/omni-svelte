<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {Badge} from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card/index.js';
	import {Separator} from '$lib/components/ui/separator';
	import {SpotlightCard} from '$lib/components/ui/spotlight-card';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import Calendar from '@lucide/svelte/icons/calendar';
  import Clock from '@lucide/svelte/icons/clock';
  import User from '@lucide/svelte/icons/user';
  import Rss from '@lucide/svelte/icons/rss';
	import { formatDate } from '$lib/utils.js';

	// Static posts — would come from velite in production
	const posts = [
		{
			title: 'Introducing OmniSvelte: SvelteKit with Superpowers',
			description: 'We\'re thrilled to announce OmniSvelte — a batteries-included meta-framework built on SvelteKit that ships with everything a production app needs.',
			date: '2025-06-01',
			author: 'Mudia',
			tags: ['announcement', 'release'],
			slug: 'introducing-omnisvelte',
			readTime: '5 min read',
			featured: true
		},
		{
			title: 'Building the Plugin System: Design Decisions',
			description: 'A deep dive into how OmniSvelte\'s typed, conflict-detecting plugin API was designed — and why we chose definePlugin over a simpler approach.',
			date: '2025-05-20',
			author: 'Mudia',
			tags: ['internals', 'plugins'],
			slug: 'plugin-system-design',
			readTime: '8 min read',
			featured: false
		},
		{
			title: 'Remote Functions: Beyond SvelteKit\'s Experimental API',
			description: 'OmniSvelte maps all 7 SvelteKit remote primitives into typed, ergonomic wrappers. Here\'s how and why.',
			date: '2025-05-10',
			author: 'Mudia',
			tags: ['remote-functions', 'typescript'],
			slug: 'remote-functions-deep-dive',
			readTime: '10 min read',
			featured: false
		},
		{
			title: 'Paystack + Stripe: Building Country-Based Payment Routing',
			description: 'How OmniSvelte detects a user\'s country and routes them to the right payment provider — automatically and transparently.',
			date: '2025-04-28',
			author: 'Mudia',
			tags: ['payments', 'africa'],
			slug: 'payment-routing',
			readTime: '7 min read',
			featured: false
		}
	];

	const featured = posts.find(p => p.featured);
	const rest = posts.filter(p => !p.featured);
</script>

<svelte:head>
	<title>Blog — OmniSvelte</title>
	<meta name="description" content="News, deep dives, and updates from the OmniSvelte team." />
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 sm:px-6 py-14">
	<!-- Header -->
	<div class="mb-12">
		<div class="flex items-center justify-between mb-4">
			<div>
				<Badge variant="outline" class="mb-3 text-violet-600 border-violet-200 dark:border-violet-800 dark:text-violet-400">
					Blog
				</Badge>
				<h1 class="text-4xl font-bold tracking-tight">Latest from OmniSvelte</h1>
				<p class="text-muted-foreground mt-2 text-lg">Updates, announcements, and deep dives from the team.</p>
			</div>
			<Button variant="outline" size="sm" class="hidden sm:inline-flex gap-2 shrink-0">
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
				<div class="flex flex-wrap gap-2 mb-4">
					<Badge variant="default" class="bg-violet-600 text-white border-0">Featured</Badge>
					{#each featured.tags as tag}
						<Badge variant="outline" class="text-xs capitalize">{tag}</Badge>
					{/each}
				</div>
				<h2 class="text-2xl sm:text-3xl font-bold tracking-tight mb-3 group-hover:text-violet-600 transition-colors">
					{featured.title}
				</h2>
				<p class="text-muted-foreground leading-relaxed mb-6">{featured.description}</p>
				<div class="flex items-center justify-between flex-wrap gap-3">
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
							{featured.readTime}
						</span>
					</div>
					<Button variant="ghost" size="sm" class="gap-1.5 text-violet-600 dark:text-violet-400 hover:text-violet-700 px-0">
						Read post <ArrowRight class="h-3.5 w-3.5" />
					</Button>
				</div>
			</a>
		</SpotlightCard>
	{/if}

	<!-- Post grid -->
	<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each rest as post}
			<a href="/blog/{post.slug}" class="group">
				<Card class="h-full hover:border-violet-200 dark:hover:border-violet-800 transition-all duration-200 hover:shadow-md hover:shadow-violet-500/5">
					<CardHeader class="pb-3">
						<div class="flex flex-wrap gap-1.5 mb-3">
							{#each post.tags as tag}
								<Badge variant="outline" class="text-[11px] h-5 px-1.5 capitalize">{tag}</Badge>
							{/each}
						</div>
						<CardTitle class="text-base leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
							{post.title}
						</CardTitle>
						<CardDescription class="leading-relaxed text-[13px] mt-1.5">{post.description}</CardDescription>
					</CardHeader>
					<CardContent class="pt-0">
						<Separator class="mb-3" />
						<div class="flex items-center justify-between text-xs text-muted-foreground">
							<span class="flex items-center gap-1"><Calendar class="h-3 w-3" /> {formatDate(post.date)}</span>
							<span class="flex items-center gap-1"><Clock class="h-3 w-3" /> {post.readTime}</span>
						</div>
					</CardContent>
				</Card>
			</a>
		{/each}
	</div>
</div>
