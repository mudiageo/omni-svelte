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
	import { StatusDot } from '$lib/components/ui/status-dot';
	import Timeline from '$lib/components/ui/timeline/index.svelte';

	import { SpotlightCard } from '$lib/components/ui/spotlight-card';
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
			status: 'done',
			color: 'rgba(139, 92, 246, 0.1)',
			items: [
				{ title: 'Database ORM (Drizzle) + Model class', status: 'done' },
				{ title: 'Authentication (Better-Auth)', status: 'done' },
				{ title: 'Schema-driven codegen & Virtual Modules', status: 'done' },
				{ title: 'omni init / add / doctor CLI', status: 'done' }
			]
		},
		{
			phase: 'Phase 2',
			version: 'v0.2',
			title: 'CLI & Developer Experience',
			status: 'progress',
			color: 'rgba(16, 185, 129, 0.1)',
			items: [
				{ title: 'omni generate remote', status: 'progress' },
				{ title: 'Schema → remote-form binding', status: 'progress' },
				{ title: 'Auth session via query.live', status: 'progress' }
			]
		},
		{
			phase: 'Phase 3',
			version: 'v0.3',
			title: 'UI & Forms',
			status: 'planned',
			color: 'rgba(245, 158, 11, 0.1)',
			items: [
				{ title: 'resource(Model) for CRUD generation', status: 'planned' },
				{ title: 'omni generate resource UI scaffold', status: 'planned' },
				{ title: 'shadcn-svelte integration', status: 'planned' }
			]
		},
		{
			phase: 'Phase 4',
			version: 'v0.4',
			title: 'Realtime, Email & Caching',
			status: 'planned',
			color: 'rgba(59, 130, 246, 0.1)',
			items: [
				{ title: 'query.live as lightweight realtime primitive', status: 'planned' },
				{ title: 'remember() on remote queries', status: 'planned' },
				{ title: 'Redis Cache Driver', status: 'planned' }
			]
		},
		{
			phase: 'Phase 5',
			version: 'v0.5',
			title: 'Jobs, Storage & Monitoring',
			status: 'planned',
			color: 'rgba(239, 68, 68, 0.1)',
			items: [
				{ title: 'Notification persistence + live feed', status: 'planned' },
				{ title: 'S3-compatible storage driver', status: 'planned' },
				{ title: 'Dev inspector Telescope-style panel', status: 'planned' }
			]
		},
		{
			phase: 'Phase 6',
			version: 'v0.6',
			title: 'Payments & Multi-tenancy',
			status: 'planned',
			color: 'rgba(16, 185, 129, 0.08)',
			items: [
				{ title: 'Paystack & Flutterwave plugins', status: 'planned' },
				{ title: 'Generic webhooks module', status: 'planned' },
				{ title: 'RBAC / Policy layer', status: 'planned' }
			]
		},
		{
			phase: 'Phase 7',
			version: 'v0.7',
			title: 'Deployment & Docs',
			status: 'planned',
			color: 'rgba(139, 92, 246, 0.1)',
			items: [
				{ title: 'SEO automation (Sitemaps, meta-tags)', status: 'planned' },
				{ title: 'Public API / SDK generator', status: 'planned' },
				{ title: 'HTTP Cache headers', status: 'planned' }
			]
		},
		{
			phase: 'Phase 8',
			version: 'v0.8',
			title: 'Plugin Ecosystem',
			status: 'planned',
			color: 'rgba(245, 158, 11, 0.1)',
			items: [
				{ title: 'Fix OmniPlugin interface import bug', status: 'planned', note: 'Priority' },
				{ title: 'Plugin-contributed remote functions', status: 'planned' },
				{ title: 'Plugin Marketplace', status: 'planned' }
			]
		},
		{
			phase: 'Phase 9',
			version: 'v0.9',
			title: 'Hardening & Quality',
			status: 'planned',
			color: 'rgba(59, 130, 246, 0.1)',
			items: [
				{ title: 'Soft-delete & Pagination scopes', status: 'planned' },
				{ title: 'Testing Toolkit & Fake Drivers', status: 'planned' },
				{ title: 'Rate Limiting & i18n modules', status: 'planned' }
			]
		},
		{
			phase: 'Phase 10',
			version: 'v1.0',
			title: 'Production Ready',
			status: 'planned',
			color: 'rgba(16, 185, 129, 0.1)',
			items: [
				{ title: 'Stable API and Full Docs', status: 'planned' },
				{ title: 'Flagship Example Apps', status: 'planned' }
			]
		},
		{
			phase: 'Phase 11',
			version: 'v1.1',
			title: 'AI & Intelligence',
			status: 'exploring',
			color: 'rgba(239, 68, 68, 0.1)',
			items: [
				{ title: 'defineAgent() structured outputs', status: 'exploring' },
				{ title: 'Vector/Embedding column type', status: 'exploring' },
				{ title: 'RAG helper in model hooks', status: 'exploring' }
			]
		},
		{
			phase: 'Phase 12',
			version: 'v1.2',
			title: 'Local-First & Cross-Platform',
			status: 'exploring',
			color: 'rgba(139, 92, 246, 0.1)',
			items: [
				{ title: 'defineLocalModel() sync', status: 'exploring' },
				{ title: 'omni add tauri / capacitor', status: 'exploring' }
			]
		},
		{
			phase: 'Phase 13',
			version: 'v1.3',
			title: 'Global Business Primitives',
			status: 'exploring',
			color: 'rgba(245, 158, 11, 0.1)',
			items: [
				{ title: 'defineWorkflow() state machine', status: 'exploring' },
				{ title: 'Money value type', status: 'exploring' },
				{ title: 'African infrastructure (SMS/NIN)', status: 'exploring' }
			]
		}
	];

	const statusConfig: Record<
		Status,
		{
			label: string;
			dot: 'success' | 'warning' | 'default' | 'info';
			badge: 'success' | 'warning' | 'secondary' | 'info';
		}
	> = {
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
	<meta
		name="description"
		content="The public OmniSvelte roadmap — what's shipped, in progress, and coming next."
	/>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-14 sm:px-6">
	<!-- Header -->
	<div class="mb-10">
		<Badge
			variant="outline"
			class="mb-4 border-primary/30 text-primary dark:border-primary/50 dark:text-primary"
		>
			Public Roadmap
		</Badge>
		<div class="mb-4 flex flex-wrap items-end justify-between gap-4">
			<div>
				<h1 class="mb-2 text-4xl font-bold tracking-tight">OmniSvelte Roadmap</h1>
				<p class="text-lg text-muted-foreground">
					What's shipped, what's building, and what's on the horizon.
				</p>
			</div>
			<Button
				href="https://github.com/mudiageo/omnisvelte/discussions"
				variant="outline"
				size="sm"
				class="shrink-0 gap-2"
				target="_blank"
				rel="noopener"
			>
				<Github class="h-3.5 w-3.5" />
				Discuss on GitHub
			</Button>
		</div>

		<!-- Legend -->
		<div class="mt-6 flex flex-wrap gap-4 rounded-lg border border-border bg-muted/30 p-4">
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
					<div class="mb-5 flex flex-wrap items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							<div class="flex flex-col">
								<div class="flex items-center gap-2.5">
									<StatusDot
										status={statusConfig[phase.status].dot}
										pulse={phase.status === 'progress'}
									/>
									<span class="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
										>{phase.phase}</span
									>
									<Badge variant="outline" class="h-5 px-1.5 font-mono text-xs"
										>{phase.version}</Badge
									>
								</div>
								<h2 class="mt-1 text-xl font-bold">{phase.title}</h2>
							</div>
						</div>
						<Badge variant={statusConfig[phase.status].badge}>
							{statusConfig[phase.status].label}
						</Badge>
					</div>

					<!-- Items grid -->
					<div class="grid gap-1.5 sm:grid-cols-2">
						{#each phase.items as item}
							<div
								class="flex items-start gap-2.5 rounded-md px-2 py-1.5 {item.status === 'done'
									? 'opacity-70'
									: ''}"
							>
								<StatusDot status={statusConfig[item.status].dot} size="sm" class="mt-1 shrink-0" />
								<div class="min-w-0">
									<span
										class="text-sm {item.status === 'done'
											? 'text-muted-foreground line-through'
											: ''}">{item.title}</span
									>
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
		<h2 class="mb-2 text-xl font-bold">Want to shape the roadmap?</h2>
		<p class="mx-auto mb-5 max-w-lg text-sm text-muted-foreground">
			Items marked 💡 Exploring are especially open to community proposals. Open a GitHub Discussion
			to share your ideas.
		</p>
		<div class="flex flex-wrap justify-center gap-3">
			<Button
				href="https://github.com/mudiageo/omnisvelte/discussions"
				variant="outline"
				class="gap-2"
				target="_blank"
				rel="noopener"
			>
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
