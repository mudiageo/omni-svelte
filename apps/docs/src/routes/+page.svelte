<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import * as Table from '$lib/components/ui/table';
	import {SpotlightCard} from '$lib/components/ui/spotlight-card';
	import {NumberTicker} from '$lib/components/ui/number-ticker';
	import {ShinyButton} from '$lib/components/ui/shiny-button';
	import {StatusDot} from '$lib/components/ui/status-dot';
	import Timeline from '$lib/components/ui/timeline/index.svelte';
  import Database from '@lucide/svelte/icons/database';
  import Shield from '@lucide/svelte/icons/shield';
  import Code2 from '@lucide/svelte/icons/code-2';
  import Puzzle from '@lucide/svelte/icons/puzzle';
  import Layers from '@lucide/svelte/icons/layers';
  import ArrowRight from '@lucide/svelte/icons/arrow-right';
  import CheckCircle2 from '@lucide/svelte/icons/check-circle-2';
  import Package from '@lucide/svelte/icons/package';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import GitBranch from '@lucide/svelte/icons/git-branch';

	const features = [
		{
			icon: Database,
			title: 'Schema-Driven Database',
			description: 'Define your data model once in .schema.ts. OmniSvelte generates Drizzle tables, Zod validators, and typed ActiveRecord model classes on every save.',
			color: 'rgba(139, 92, 246, 0.12)'
		},
		{
			icon: Shield,
			title: 'Auth, Wired In',
			description: 'Better-Auth pre-configured in svelte.config.js. Email, magic link, OAuth, 2FA, and passkeys — automatically hooked into SvelteKit sessions.',
			color: 'rgba(59, 130, 246, 0.12)'
		},
		{
			icon: Code2,
			title: 'Virtual Module Aliases',
			description: 'Import $db, $auth/server, $auth/client, $models/*, $schema, $validation/* — generated paths that always resolve correctly, no hardcoding.',
			color: 'rgba(245, 158, 11, 0.12)'
		},
		{
			icon: Layers,
			title: 'Model Relationships',
			description: 'hasMany, belongsTo, hasOne, belongsToMany — defined in your schema, resolved with .with([]) eager loading on any query.',
			color: 'rgba(16, 185, 129, 0.12)'
		},
		{
			icon: Puzzle,
			title: 'Plugin System',
			description: 'A comprehensive OmniPlugin interface for extending tables, hooks, auth providers, CLI commands, routes, UI components, and realtime channels.',
			color: 'rgba(239, 68, 68, 0.12)'
		},
		{
			icon: Sparkles,
			title: 'Zero Config Start',
			description: 'One Vite plugin. One config block. OmniSvelte handles hook injection, type generation, virtual modules, and wiring — on every pnpm dev.',
			color: 'rgba(99, 102, 241, 0.12)'
		}
	];

	

	const timelineItems = [
		{ date: 'v0.1 · Now', title: 'Core Foundation', description: 'Schema codegen, Drizzle models, Better-Auth, virtual modules, Plugin API types, Vite plugin', variant: 'success' as const },
		{ date: 'v0.2 · Soon', title: 'Developer Experience', description: 'CLI (omni init/add/generate), UI layer, email, caching, plugin marketplace', variant: 'default' as const },
		{ date: 'v0.3', title: 'Production Features', description: 'Realtime channels, background jobs, payments (Stripe + Paystack), file storage', variant: 'warning' as const },
		{ date: 'v0.4+', title: 'Ecosystem & AI', description: 'Local-first sync, AI primitives, Tauri desktop adapter, African infrastructure', variant: 'warning' as const }
	];

	const comparisons = [
		{ feature: 'SvelteKit routing', omni: true, plain: true },
		{ feature: 'Database ORM', omni: true, plain: false },
		{ feature: 'Schema codegen (Drizzle + Zod + Models)', omni: true, plain: false },
		{ feature: 'Auth pre-wired', omni: true, plain: false },
		{ feature: 'Virtual module aliases', omni: true, plain: false },
		{ feature: 'Model relationships', omni: true, plain: false },
		{ feature: 'Lifecycle hooks', omni: true, plain: false },
		{ feature: 'Plugin system', omni: true, plain: false },
		{ feature: 'Works with any SvelteKit adapter', omni: true, plain: true }
	];

	const configExample = `// svelte.config.js
const config = {
  kit: { adapter: adapter() },
  omni: {
    database: {
      enabled: true,
      connection: { url: process.env.DATABASE_URL }
    },
    auth: {
      enabled: true,
      secret: process.env.BETTER_AUTH_SECRET,
      emailAndPassword: { enabled: true }
    }
  }
};`;

	const schemaExample = `// src/lib/posts.schema.ts
import { defineSchema, field } from 'omni-svelte/schema';

export default defineSchema('posts', {
  id:        field.serial().primaryKey(),
  title:     field.string(255).required(),
  slug:      field.slug().required().unique(),
  content:   field.string().required(),
  published: field.boolean().default(false),
  userId:    field.integer().required()
}, {
  timestamps: true,
  indexes: ['slug', 'published'],
  softDeletes: false
});`;

	const modelExample = `// OmniSvelte auto-generates $models/posts.model
import { Posts } from '$models/posts.model';

// Find
const post  = await Posts.find(1);
const posts = await Posts.query()
  .where('published', true)
  .orderBy('created_at', 'desc')
  .limit(10).get();

// Create / update / delete
const newPost = await Posts.create({ title, slug, content, userId });
await post.update({ title: 'New title' });
await post.delete();

// Relationships (eager loading)
const full = await Posts.with(['author', 'comments']).find(1);`;
</script>

<svelte:head>
	<title>OmniSvelte — SvelteKit, but with superpowers</title>
	<meta name="description" content="A batteries-included framework that transforms SvelteKit with database ORM, auth, schema codegen, typed models, and a plugin system — all wired in." />
</svelte:head>

<!-- ─── HERO ──────────────────────────────────────────────── -->
<section class="relative overflow-hidden border-b border-border/40">
	<div class="absolute inset-0 bg-grid"></div>
	<div class="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background pointer-events-none"></div>
	<div class="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-primary/8 blur-3xl pointer-events-none"></div>

	<div class="relative container mx-auto max-w-5xl px-4 sm:px-6 py-24 md:py-36 text-center">
		<div class="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1 text-xs text-muted-foreground mb-8 backdrop-blur">
			<StatusDot status="success" pulse size="sm" />
			<span>v0.1.0-alpha — Database, Auth & Schema generation stable</span>
		</div>

		<h1 class="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-6">
			SvelteKit,<br/>
			<span class="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent" style="-webkit-background-clip: text; background-clip: text;">
				but with superpowers
			</span>
		</h1>

		<p class="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-10">
			A batteries-included framework built on SvelteKit.
			One Vite plugin. One config block. Database ORM, auth, schema codegen,
			typed models, virtual modules — all wired together on every <code class="font-mono text-sm bg-muted px-1.5 py-0.5 rounded">pnpm dev</code>.
		</p>

		<div class="flex flex-wrap items-center justify-center gap-3 mb-14">
			<ShinyButton href="/docs/getting-started/installation" class="h-11 px-6 text-sm bg-primary hover:bg-primary/80 text-primary-foreground border-0 shadow-lg shadow-primary/20">
				Get Started
				<ArrowRight class="h-4 w-4 ml-1" />
			</ShinyButton>
			<Button href="/docs/getting-started/introduction" variant="outline" class="h-11 px-6 text-sm">Read the Docs</Button>
			<Button href="https://github.com/mudiageo/omni-svelte" variant="ghost" class="h-11 px-4 text-sm gap-2" target="_blank" rel="noopener">
				<GitBranch class="h-4 w-4" /> GitHub
			</Button>
		</div>

		<!-- Install snippet -->
		<div class="inline-flex items-center gap-3 rounded-lg border border-border/60 bg-zinc-950 dark:bg-zinc-900 px-4 py-2.5 text-sm font-mono text-zinc-300">
			<span class="text-primary select-none">$</span>
			<span>pnpx omni-svelte init</span>
		</div>
	</div>
</section>


<!-- ─── FEATURES ──────────────────────────────────────────── -->
<section class="py-24 border-b border-border/40">
	<div class="container mx-auto max-w-6xl px-4 sm:px-6">
		<div class="text-center mb-14">
			<Badge variant="outline" class="mb-4 text-primary border-primary/30 dark:border-primary/50 dark:text-primary">Everything included</Badge>
			<h2 class="text-3xl sm:text-4xl font-bold tracking-tight mb-4">All the pieces, none of the glue</h2>
			<p class="text-muted-foreground text-lg max-w-2xl mx-auto">Stop wiring the same things together on every project. OmniSvelte handles it at the framework level.</p>
		</div>
		<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each features as feat}
				<SpotlightCard color={feat.color} size={280} class="h-full cursor-default">
					<div class="p-6">
						<div class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
							<feat.icon class="h-5 w-5 text-foreground" />
						</div>
						<h3 class="font-semibold text-base mb-2">{feat.title}</h3>
						<p class="text-sm text-muted-foreground leading-relaxed">{feat.description}</p>
					</div>
				</SpotlightCard>
			{/each}
		</div>
	</div>
</section>

<!-- ─── CODE WALKTHROUGH ──────────────────────────────────── -->
<section class="py-24 border-b border-border/40 bg-muted/20">
	<div class="container mx-auto max-w-6xl px-4 sm:px-6 space-y-20">

		<!-- Step 1: Config -->
		<div class="grid lg:grid-cols-2 gap-12 items-center">
			<div>
				<Badge variant="outline" class="mb-4 text-primary border-primary/30 dark:border-primary/50 dark:text-primary">Step 1</Badge>
				<h2 class="text-3xl font-bold tracking-tight mb-4">One config block</h2>
				<p class="text-muted-foreground leading-relaxed mb-5">
					Add the <code class="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">omni</code> block to your existing <code class="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">svelte.config.js</code>.
					Enable database and auth — OmniSvelte handles the rest.
				</p>
				<ul class="space-y-2.5 text-sm">
					{#each ['Zero Drizzle boilerplate', 'Better-Auth wired to SvelteKit hooks', 'Type declarations auto-generated'] as item}
						<li class="flex items-center gap-2.5"><CheckCircle2 class="h-4 w-4 text-primary shrink-0" />{item}</li>
					{/each}
				</ul>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
				<div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/70">
					<div class="h-2.5 w-2.5 rounded-full bg-red-500/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-amber-500/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-green-500/70"></div>
					<span class="ml-2 text-xs text-zinc-500 font-mono">svelte.config.js</span>
				</div>
				<pre class="p-5 text-xs sm:text-sm font-mono leading-relaxed text-zinc-300 overflow-x-auto"><code>{configExample}</code></pre>
			</div>
		</div>

		<Separator />

		<!-- Step 2: Schema -->
		<div class="grid lg:grid-cols-2 gap-12 items-center">
			<div class="order-2 lg:order-1 rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
				<div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/70">
					<div class="h-2.5 w-2.5 rounded-full bg-red-500/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-amber-500/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-green-500/70"></div>
					<span class="ml-2 text-xs text-zinc-500 font-mono">src/lib/posts.schema.ts</span>
				</div>
				<pre class="p-5 text-xs sm:text-sm font-mono leading-relaxed text-zinc-300 overflow-x-auto"><code>{schemaExample}</code></pre>
			</div>
			<div class="order-1 lg:order-2">
				<Badge variant="outline" class="mb-4 text-primary border-primary/30 dark:border-primary/50 dark:text-primary">Step 2</Badge>
				<h2 class="text-3xl font-bold tracking-tight mb-4">Define your schema once</h2>
				<p class="text-muted-foreground leading-relaxed mb-5">
					Create a <code class="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">.schema.ts</code> file with the fluent <code class="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">field.*</code> builder. On every save, OmniSvelte generates three outputs automatically.
				</p>
				<div class="grid grid-cols-3 gap-3">
					{#each ['Drizzle table', 'Zod validators', 'Model class'] as output}
						<Card.Root class="text-center py-3 px-2">
							<p class="text-xs font-mono text-primary dark:text-primary font-semibold">{output.split(' ')[0]}</p>
							<p class="text-[11px] text-muted-foreground mt-0.5">{output.split(' ').slice(1).join(' ')}</p>
						</Card.Root>
					{/each}
				</div>
			</div>
		</div>

		<Separator />

		<!-- Step 3: Use -->
		<div class="grid lg:grid-cols-2 gap-12 items-center">
			<div>
				<Badge variant="outline" class="mb-4 text-green-600 border-green-200 dark:border-green-800 dark:text-green-400">Step 3</Badge>
				<h2 class="text-3xl font-bold tracking-tight mb-4">Use the generated model</h2>
				<p class="text-muted-foreground leading-relaxed mb-5">
					Import from virtual aliases — <code class="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">$models</code>, <code class="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">$db</code>, <code class="text-sm font-mono bg-muted px-1.5 py-0.5 rounded">$auth/server</code> — no path management needed.
				</p>
				<Button href="/docs/database/model-api" variant="outline" class="gap-2">
					Model API Reference <ArrowRight class="h-3.5 w-3.5" />
				</Button>
			</div>
			<div class="rounded-xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
				<div class="flex items-center gap-1.5 px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/70">
					<div class="h-2.5 w-2.5 rounded-full bg-red-500/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-amber-500/70"></div>
					<div class="h-2.5 w-2.5 rounded-full bg-green-500/70"></div>
					<span class="ml-2 text-xs text-zinc-500 font-mono">+page.server.ts</span>
				</div>
				<pre class="p-5 text-xs sm:text-sm font-mono leading-relaxed text-zinc-300 overflow-x-auto"><code>{modelExample}</code></pre>
			</div>
		</div>
	</div>
</section>

<!-- ─── COMPARISON ────────────────────────────────────────── -->
<section class="py-24 border-b border-border/40">
	<div class="container mx-auto max-w-3xl px-4 sm:px-6">
		<div class="text-center mb-10">
			<h2 class="text-3xl font-bold tracking-tight mb-2">OmniSvelte vs plain SvelteKit</h2>
			<p class="text-muted-foreground">Same foundation. Everything you'd add manually — already wired in.</p>
		</div>
		<Card.Root class="overflow-hidden">
			<Table.Root>
				<Table.Header>
					<Table.Row class="bg-muted/50">
						<Table.Head class="text-xs uppercase tracking-wider text-muted-foreground">Feature</Table.Head>
						<Table.Head class="text-center text-xs uppercase tracking-wider text-primary">OmniSvelte</Table.Head>
						<Table.Head class="text-center text-xs uppercase tracking-wider text-muted-foreground">Plain SvelteKit</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each comparisons as row, i}
						<Table.Row class={i % 2 === 1 ? 'bg-muted/20' : ''}>
							<Table.Cell class="font-medium text-sm">{row.feature}</Table.Cell>
							<Table.Cell class="text-center">
								{#if row.omni}
									<CheckCircle2 class="h-4 w-4 text-green-500 mx-auto" />
								{:else}
									<span class="text-muted-foreground text-sm">—</span>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-center">
								{#if row.plain}
									<CheckCircle2 class="h-4 w-4 text-green-500 mx-auto" />
								{:else}
									<span class="text-muted-foreground text-sm">DIY</span>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Root>
	</div>
</section>

<!-- ─── ROADMAP ───────────────────────────────────────────── -->
<section class="py-24 border-b border-border/40 bg-muted/20">
	<div class="container mx-auto max-w-5xl px-4 sm:px-6">
		<div class="grid lg:grid-cols-2 gap-12 items-start">
			<div>
				<Badge variant="outline" class="mb-4 text-primary border-primary/30 dark:border-primary/50 dark:text-primary">Roadmap</Badge>
				<h2 class="text-3xl font-bold tracking-tight mb-4">Built for the long term</h2>
				<p class="text-muted-foreground leading-relaxed mb-6">
					OmniSvelte starts with a solid foundation and grows incrementally — email, caching, realtime, payments, jobs, and more.
				</p>
				<div class="flex flex-wrap gap-2 mb-8">
					{#each ['Email', 'Caching', 'Realtime', 'Payments', 'Jobs', 'File Storage', 'CLI'] as item}
						<Badge variant="secondary" class="text-xs">{item}</Badge>
					{/each}
				</div>
				<Button href="/docs/roadmap" variant="outline" class="gap-2">
					Full Roadmap <ArrowRight class="h-3.5 w-3.5" />
				</Button>
			</div>
			<Timeline items={timelineItems} />
		</div>
	</div>
</section>

<!-- ─── CTA ───────────────────────────────────────────────── -->
<section class="py-28">
	<div class="container mx-auto max-w-3xl px-4 sm:px-6 text-center">
		<div class="relative rounded-2xl border border-primary/20 dark:border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 px-8 py-16 overflow-hidden">
			<div class="absolute -top-20 -right-20 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none"></div>
			<div class="absolute -bottom-20 -left-20 w-64 h-64 bg-primary/8 rounded-full blur-3xl pointer-events-none"></div>
			<div class="relative">
				<Badge variant="outline" class="mb-5 text-primary border-primary/30 dark:border-primary/30 dark:text-primary">Open Source · MIT License</Badge>
				<h2 class="text-3xl sm:text-4xl font-bold tracking-tight mb-4">Start building today</h2>
				<p class="text-muted-foreground text-lg mb-8 max-w-xl mx-auto">Free, open source, and ready to use. Add OmniSvelte to any SvelteKit project in minutes.</p>
				<div class="flex flex-wrap items-center justify-center gap-3">
					<ShinyButton href="/docs/getting-started/installation" class="h-11 px-7 text-sm bg-primary hover:bg-primary/80 text-primary-foreground border-0 shadow-lg shadow-primary/20">
						Get Started Free <ArrowRight class="h-4 w-4 ml-1" />
					</ShinyButton>
					<Button href="https://github.com/mudiageo/omni-svelte" variant="outline" class="h-11 px-5 gap-2" target="_blank" rel="noopener">
						<GitBranch class="h-4 w-4" /> View on GitHub
					</Button>
				</div>
			</div>
		</div>
	</div>
</section>
