<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import {Badge} from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '$lib/components/ui/card/index.js';
	import {Separator} from '$lib/components/ui/separator';
	import {StatusDot} from '$lib/components/ui/status-dot';
	import Timeline from '$lib/components/ui/timeline/index.svelte';
	
	import {SpotlightCard} from '$lib/components/ui/spotlight-card';
	import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
import Circle from '@lucide/svelte/icons/circle';
import Clock from '@lucide/svelte/icons/clock';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import Github from '$lib/icons/github.svelte';

	type Status = 'done' | 'progress' | 'planned' | 'exploring';

	const phases: Array<{
		phase: string;
		version: string;
		title: string;
		status: Status;
		color: string;
		items: Array<{ title: string; status: Status; note?: string }>;
	}> = [
		{
			phase: 'Phase 1',
			version: 'v0.1',
			title: 'Foundation',
			status: 'progress',
			color: 'rgba(139, 92, 246, 0.1)',
			items: [
				{ title: 'Plugin API (definePlugin, createPlugin)', status: 'done' },
				{ title: 'omni() helper in svelte.config.ts', status: 'done' },
				{ title: 'PluginRegistry with conflict detection', status: 'done' },
				{ title: 'Virtual modules (omni:tables, omni:remote/*)', status: 'done' },
				{ title: 'Database plugin (Drizzle + PostgreSQL)', status: 'done' },
				{ title: 'Auth plugin (Better Auth)', status: 'done' },
				{ title: 'Remote function wrappers — query, command', status: 'done' },
				{ title: 'Remote function wrappers — live, batch, form, prerender, requested', status: 'progress', note: 'In progress' },
				{ title: 'omni create CLI', status: 'progress', note: 'Wizard in progress' },
				{ title: 'omni db CLI (push, generate, migrate)', status: 'progress' },
				{ title: 'omni generate CLI', status: 'planned' }
			]
		},
		{
			phase: 'Phase 2',
			version: 'v0.2',
			title: 'Production Ready',
			status: 'progress',
			color: 'rgba(16, 185, 129, 0.1)',
			items: [
				{ title: 'Payments plugin (Paystack + Stripe)', status: 'progress', note: 'Country routing done' },
				{ title: 'query.live() — real-time remote queries', status: 'progress', note: 'WebSocket + SSE' },
				{ title: 'Route guards & middleware', status: 'planned' },
				{ title: 'Role-based access control helpers', status: 'planned' },
				{ title: 'Email plugin (Resend + Nodemailer)', status: 'planned' },
				{ title: 'File storage plugin (R2, S3)', status: 'planned' },
				{ title: 'VS Code extension', status: 'planned' },
				{ title: 'createPluginTestHarness()', status: 'planned' }
			]
		},
		{
			phase: 'Phase 3',
			version: 'v0.3',
			title: 'AI-Native Primitives',
			status: 'exploring',
			color: 'rgba(245, 158, 11, 0.1)',
			items: [
				{ title: 'omni ai — provider-agnostic AI plugin', status: 'exploring' },
				{ title: 'defineAgent() — structured agent scaffold', status: 'exploring' },
				{ title: 'streamResponse() — SSE streaming from remote functions', status: 'exploring' },
				{ title: 'RAG plugin (pgvector, Pinecone)', status: 'exploring' },
				{ title: 'AI-powered omni generate', status: 'exploring' }
			]
		},
		{
			phase: 'Phase 4',
			version: 'v0.4',
			title: 'Local-First & Offline',
			status: 'exploring',
			color: 'rgba(59, 130, 246, 0.1)',
			items: [
				{ title: 'sveltekit-sync integration', status: 'exploring' },
				{ title: 'Dexie.js adapter for offline queries', status: 'exploring' },
				{ title: 'CRDT conflict resolution', status: 'exploring' },
				{ title: 'Optimistic update helpers for command()', status: 'exploring' }
			]
		},
		{
			phase: 'Phase 5',
			version: 'v0.5',
			title: 'Cross-Platform',
			status: 'exploring',
			color: 'rgba(239, 68, 68, 0.1)',
			items: [
				{ title: 'omni create --platform tauri', status: 'exploring' },
				{ title: 'omnisvelte-plugin-tauri', status: 'exploring' },
				{ title: 'Capacitor adapter (iOS + Android)', status: 'exploring' }
			]
		},
		{
			phase: 'Phase 6',
			version: 'v0.6',
			title: 'African Infrastructure',
			status: 'exploring',
			color: 'rgba(16, 185, 129, 0.08)',
			items: [
				{ title: 'Paystack full feature coverage', status: 'progress' },
				{ title: 'Flutterwave plugin', status: 'exploring' },
				{ title: 'Termii / mNotify SMS plugin', status: 'exploring' },
				{ title: "Africa's Talking plugin (SMS, USSD, voice)", status: 'exploring' },
				{ title: 'MTN MoMo integration', status: 'exploring' },
				{ title: 'Multi-currency formatting (NGN, GHS, KES)', status: 'planned' }
			]
		}
	];

	const statusConfig: Record<Status, { label: string; dot: 'success' | 'warning' | 'default' | 'info'; badge: 'success' | 'warning' | 'secondary' | 'info' }> = {
		done: { label: 'Done', dot: 'success', badge: 'success' },
		progress: { label: 'In Progress', dot: 'warning', badge: 'warning' },
		planned: { label: 'Planned', dot: 'default', badge: 'secondary' },
		exploring: { label: 'Exploring', dot: 'info', badge: 'info' }
	};

	const legend = [
		{ status: 'done' as Status, icon: CheckCircle2 },
		{ status: 'progress' as Status, icon: Clock },
		{ status: 'planned' as Status, icon: Circle },
		{ status: 'exploring' as Status, icon: Lightbulb }
	];
</script>

<svelte:head>
	<title>Roadmap — OmniSvelte</title>
	<meta name="description" content="The public OmniSvelte roadmap — what's shipped, in progress, and coming next." />
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 sm:px-6 py-14">
	<!-- Header -->
	<div class="mb-10">
		<Badge variant="outline" class="mb-4 text-violet-600 border-violet-200 dark:border-violet-800 dark:text-violet-400">
			Public Roadmap
		</Badge>
		<div class="flex items-end justify-between flex-wrap gap-4 mb-4">
			<div>
				<h1 class="text-4xl font-bold tracking-tight mb-2">OmniSvelte Roadmap</h1>
				<p class="text-muted-foreground text-lg">What's shipped, what's building, and what's on the horizon.</p>
			</div>
			<Button href="https://github.com/mudiageo/omnisvelte/discussions" variant="outline" size="sm" class="gap-2 shrink-0" target="_blank" rel="noopener">
				<Github class="h-3.5 w-3.5" />
				Discuss on GitHub
			</Button>
		</div>

		<!-- Legend -->
		<div class="flex flex-wrap gap-4 mt-6 p-4 rounded-lg border border-border bg-muted/30">
			{#each legend as l}
				<div class="flex items-center gap-2 text-sm">
					<StatusDot status={statusConfig[l.status].dot} size="md" />
					<span class="text-muted-foreground">{statusConfig[l.status].label}</span>
				</div>
			{/each}
		</div>
		<Separator class="mt-6" />
	</div>

	<!-- Phase cards -->
	<div class="space-y-8">
		{#each phases as phase}
			<SpotlightCard color={phase.color} size={500} class="w-full">
				<div class="p-6">
					<!-- Phase header -->
					<div class="flex items-start justify-between flex-wrap gap-3 mb-5">
						<div class="flex items-center gap-3">
							<div class="flex flex-col">
								<div class="flex items-center gap-2.5">
									<StatusDot status={statusConfig[phase.status].dot} pulse={phase.status === 'progress'} />
									<span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{phase.phase}</span>
									<Badge variant="outline" class="text-xs font-mono h-5 px-1.5">{phase.version}</Badge>
								</div>
								<h2 class="text-xl font-bold mt-1">{phase.title}</h2>
							</div>
						</div>
						<Badge variant={statusConfig[phase.status].badge}>
							{statusConfig[phase.status].label}
						</Badge>
					</div>

					<!-- Items grid -->
					<div class="grid sm:grid-cols-2 gap-1.5">
						{#each phase.items as item}
							<div class="flex items-start gap-2.5 py-1.5 px-2 rounded-md {item.status === 'done' ? 'opacity-70' : ''}">
								<StatusDot
									status={statusConfig[item.status].dot}
									size="sm"
									class="mt-1 shrink-0"
								/>
								<div class="min-w-0">
									<span class="text-sm {item.status === 'done' ? 'line-through text-muted-foreground' : ''}">{item.title}</span>
									{#if item.note}
										<span class="ml-2 text-xs text-muted-foreground">— {item.note}</span>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			</SpotlightCard>
		{/each}
	</div>

	<!-- Community CTA -->
	<div class="mt-14 rounded-xl border border-border bg-muted/30 p-8 text-center">
		<h2 class="text-xl font-bold mb-2">Want to shape the roadmap?</h2>
		<p class="text-muted-foreground mb-5 text-sm max-w-lg mx-auto">
			Items marked 💡 Exploring are especially open to community proposals. Open a GitHub Discussion to share your ideas.
		</p>
		<div class="flex flex-wrap gap-3 justify-center">
			<Button href="https://github.com/mudiageo/omnisvelte/discussions" variant="outline" class="gap-2" target="_blank" rel="noopener">
				<Github class="h-4 w-4" />
				Open a Discussion
			</Button>
			<Button href="/docs/getting-started/introduction" variant="ghost" class="gap-1.5">
				Start Building
				<ArrowRight class="h-3.5 w-3.5" />
			</Button>
		</div>
	</div>
</div>
