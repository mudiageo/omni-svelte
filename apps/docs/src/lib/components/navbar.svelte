<script lang="ts">
	import { page } from '$app/state';
	import { toggleMode } from 'mode-watcher';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ShinyButton } from '$lib/components/ui/shiny-button';
	import { cn } from '$lib/utils.js';

	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import { Github, OmniIcon } from '$lib/icons';

	let menuOpen = $state(false);

	const navLinks = [
		{ href: '/docs/getting-started/introduction', label: 'Docs', match: '/docs' },
		{ href: '/docs/roadmap', label: 'Roadmap', match: '/roadmap' },
		{ href: '/blog', label: 'Blog', match: '/blog' },
		{ href: '/showcase', label: 'Showcase', match: '/showcase' }
	];

	const isActive = (match: string) =>
		match === '/docs' ? page.url.pathname.startsWith('/docs') : page.url.pathname.startsWith(match);
</script>

<header
	class="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60"
>
	<div class="container mx-auto flex h-14 max-w-screen-2xl items-center px-4 sm:px-6">
		<!-- Logo -->
		<a href="/" class="group mr-6 flex shrink-0 items-center gap-2">
			<div
				class="group-hover:shadow-primary-500/30 flex h-7 w-7 items-center justify-center rounded-md shadow-sm transition-shadow"
			>
				<OmniIcon class="h-4 w-4" />
			</div>
			<span class="text-base font-bold tracking-tight">
				Omni<span class="text-primary">Svelte</span>
			</span>
			<Badge variant="secondary" class="hidden h-4 px-1.5 text-[10px] font-semibold sm:inline-flex"
				>alpha</Badge
			>
		</a>

		<!-- Desktop nav -->
		<nav class="hidden flex-1 items-center gap-1 text-sm md:flex">
			{#each navLinks as link}
				<a
					href={link.href}
					class={cn(
						'rounded-md px-3 py-1.5 transition-colors',
						isActive(link.match)
							? 'bg-accent font-medium text-foreground'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					)}
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<!-- Right side -->
		<div class="ml-auto flex items-center gap-1">
			<a
				href="https://github.com/mudiageo/omni-svelte"
				target="_blank"
				rel="noopener noreferrer"
				aria-label="GitHub"
			>
				<Button variant="ghost" size="icon" class="hidden h-8 w-8 md:inline-flex">
					<Github class="h-4 w-4" />
				</Button>
			</a>
			<Button
				variant="ghost"
				size="icon"
				onclick={toggleMode}
				class="h-8 w-8"
				aria-label="Toggle theme"
			>
				<Sun class="h-4 w-4 dark:hidden" />
				<Moon class="hidden h-4 w-4 dark:block" />
			</Button>
			<ShinyButton
				href="/docs/getting-started/installation"
				class="ml-1 hidden h-8 gap-1.5 border-0 bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/80 md:inline-flex"
			>
				Get Started <ArrowRight class="h-3 w-3" />
			</ShinyButton>
			<Button
				variant="ghost"
				size="icon"
				onclick={() => (menuOpen = !menuOpen)}
				class="h-8 w-8 md:hidden"
			>
				{#if menuOpen}<X class="h-4 w-4" />{:else}<Menu class="h-4 w-4" />{/if}
			</Button>
		</div>
	</div>

	<!-- Mobile menu -->
	{#if menuOpen}
		<div class="flex flex-col gap-1 border-t border-border/40 bg-background px-4 py-3 md:hidden">
			{#each navLinks as link}
				<a
					href={link.href}
					onclick={() => (menuOpen = false)}
					class={cn(
						'rounded-md px-3 py-2 text-sm transition-colors',
						isActive(link.match)
							? 'bg-accent font-medium text-foreground'
							: 'text-muted-foreground hover:bg-accent hover:text-foreground'
					)}>{link.label}</a
				>
			{/each}
			<Separator class="my-2" />
			<Button
				href="/docs/getting-started/installation"
				size="sm"
				class="border-0 bg-primary text-primary-foreground hover:bg-primary/80"
			>
				Get Started
			</Button>
		</div>
	{/if}
</header>
