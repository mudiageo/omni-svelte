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
	import { StatusDot } from '$lib/components/ui/status-dot/index.js';
	import { ShinyButton } from '$lib/components/ui/shiny-button';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import Github from '$lib/icons/github.svelte'; //@TODO get raw svg
	import Globe from '@lucide/svelte/icons/globe';
	import Plus from '@lucide/svelte/icons/plus';

	const projects = [
		{
			name: 'ReelView',
			description:
				'Async video code review SaaS. Teams review code asynchronously via video recordings with timestamps and inline comments.',
			tags: ['SaaS', 'Video', 'Code Review'],
			stack: ['OmniSvelte', 'Aurora PostgreSQL', 'Drizzle', 'better-auth', 'Paystack', 'Stripe'],
			author: 'Mudia',
			status: 'live' as const,
			url: '#',
			github: 'https://github.com/mudiageo/reelview',
			color: 'rgba(139, 92, 246, 0.1)'
		},
		{
			name: 'LexAI',
			description:
				'AI-powered legal & business operations platform for Nigerian founders. CAC registration, contracts, compliance, built on OmniSvelte + Gemini.',
			tags: ['AI', 'Legal', 'Nigeria'],
			stack: ['OmniSvelte', 'Gemini', 'Paystack', 'Google Cloud'],
			author: 'Mudia',
			status: 'live' as const,
			url: '#',
			github: 'https://github.com/mudiageo/lexai',
			color: 'rgba(16, 185, 129, 0.1)'
		},
		{
			name: 'Lowo',
			description:
				'Nigerian-context budget planner PWA with AI spending insights. Built with OmniSvelte remote functions, Dexie.js, and Gemini 2.5 Flash.',
			tags: ['Finance', 'PWA', 'Africa'],
			stack: ['OmniSvelte', 'Dexie.js', 'Gemini', 'shadcn-svelte'],
			author: 'Mudia',
			status: 'live' as const,
			url: '#',
			github: 'https://github.com/mudiageo/lowo',
			color: 'rgba(245, 158, 11, 0.1)'
		},
		{
			name: 'Lerno',
			description:
				'Cross-platform social learning platform with live sessions, mediasoup SFU, Cloudflare R2, and a Tauri v2 desktop app.',
			tags: ['Education', 'Real-time', 'Cross-platform'],
			stack: ['OmniSvelte', 'Tauri v2', 'mediasoup', 'Cloudflare R2', 'Paystack'],
			author: 'Mudia',
			status: 'beta' as const,
			url: '#',
			github: 'https://github.com/mudiageo/lerno',
			color: 'rgba(59, 130, 246, 0.1)'
		}
	];

	const statusLabel = { live: 'Live', beta: 'Beta', wip: 'WIP' };
	const statusDot = { live: 'success', beta: 'warning', wip: 'default' } as const;
</script>

<svelte:head>
	<title>Showcase — OmniSvelte</title>
	<meta
		name="description"
		content="Projects built with OmniSvelte — from SaaS platforms to AI tools and mobile apps."
	/>
</svelte:head>

<div class="container mx-auto max-w-6xl px-4 py-14 sm:px-6">
	<!-- Header -->
	<div class="mb-12">
		<Badge
			variant="outline"
			class="mb-4 border-primary/30 text-primary dark:border-primary/50 dark:text-primary"
		>
			Showcase
		</Badge>
		<div class="flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="mb-2 text-4xl font-bold tracking-tight">Built with OmniSvelte</h1>
				<p class="text-lg text-muted-foreground">
					Real projects shipping with OmniSvelte in production and beyond.
				</p>
			</div>
			<ShinyButton
				href="https://github.com/mudiageo/omnisvelte/discussions/new?category=showcase"
				variant="outline"
				class="shrink-0 gap-2"
				target="_blank"
				rel="noopener"
			>
				<Plus class="h-4 w-4" />
				Submit Project
			</ShinyButton>
		</div>
		<Separator class="mt-8" />
	</div>

	<!-- Stats row -->
	<div class="mb-12 grid grid-cols-3 gap-6 sm:grid-cols-3">
		{#each [{ label: 'Projects Submitted', value: '4+' }, { label: 'Countries Reached', value: '6+' }, { label: 'Industries', value: '5+' }] as stat}
			<Card class="py-5 text-center">
				<p class="mb-1 text-3xl font-bold text-foreground">{stat.value}</p>
				<p class="text-xs tracking-wide text-muted-foreground uppercase">{stat.label}</p>
			</Card>
		{/each}
	</div>

	<!-- Project grid -->
	<div class="grid gap-6 sm:grid-cols-2">
		{#each projects as project}
			<SpotlightCard color={project.color} size={320} class="h-full">
				<div class="flex h-full flex-col p-6">
					<!-- Header -->
					<div class="mb-3 flex items-start justify-between">
						<div>
							<div class="mb-1 flex items-center gap-2">
								<h3 class="text-lg font-bold">{project.name}</h3>
								<div class="flex items-center gap-1.5">
									<StatusDot
										status={statusDot[project.status]}
										pulse={project.status === 'live'}
										size="sm"
									/>
									<span class="text-xs text-muted-foreground">{statusLabel[project.status]}</span>
								</div>
							</div>
							<p class="text-xs text-muted-foreground">by {project.author}</p>
						</div>
						<div class="flex items-center gap-1">
							{#if project.github}
								<a href={project.github} target="_blank" rel="noopener" aria-label="GitHub">
									<Button variant="ghost" size="icon" class="h-7 w-7">
										<Github class="h-3.5 w-3.5" />
									</Button>
								</a>
							{/if}
							{#if project.url && project.url !== '#'}
								<a href={project.url} target="_blank" rel="noopener" aria-label="Live site">
									<Button variant="ghost" size="icon" class="h-7 w-7">
										<Globe class="h-3.5 w-3.5" />
									</Button>
								</a>
							{/if}
						</div>
					</div>

					<!-- Tags -->
					<div class="mb-3 flex flex-wrap gap-1.5">
						{#each project.tags as tag}
							<Badge variant="secondary" class="h-5 px-2 text-xs">{tag}</Badge>
						{/each}
					</div>

					<!-- Description -->
					<p class="mb-4 flex-1 text-sm leading-relaxed text-muted-foreground">
						{project.description}
					</p>

					<!-- Stack -->
					<div class="border-t border-border/50 pt-3">
						<p
							class="mb-2 text-[11px] font-semibold tracking-wider text-muted-foreground/60 uppercase"
						>
							Stack
						</p>
						<div class="flex flex-wrap gap-1.5">
							{#each project.stack as tech}
								<span class="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground"
									>{tech}</span
								>
							{/each}
						</div>
					</div>
				</div>
			</SpotlightCard>
		{/each}
	</div>

	<!-- Submit CTA -->
	<div class="mt-14 rounded-xl border border-border bg-muted/30 p-8 text-center">
		<h2 class="mb-2 text-xl font-bold">Built something with OmniSvelte?</h2>
		<p class="mb-5 text-sm text-muted-foreground">
			Share your project with the community. Open a GitHub Discussion in the Showcase category.
		</p>
		<Button
			href="https://github.com/mudiageo/omnisvelte/discussions/new?category=showcase"
			variant="outline"
			class="gap-2"
			target="_blank"
			rel="noopener"
		>
			<Plus class="h-4 w-4" />
			Submit Your Project
		</Button>
	</div>
</div>
