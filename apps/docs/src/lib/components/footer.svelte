<script lang="ts">
  import Globe from '@lucide/svelte/icons/globe';
  import { Github, OmniIcon } from '$lib/icons'; 
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { StatusDot } from '$lib/components/ui/status-dot/index.js';

	const cols = [
		{
			title: 'Documentation',
			links: [
				{ href: '/docs/getting-started/introduction', label: 'Introduction' },
				{ href: '/docs/getting-started/installation', label: 'Installation' },
				{ href: '/docs/getting-started/quick-start', label: 'Quick Start' },
				{ href: '/docs/plugins/overview', label: 'Plugin System' },
				{ href: '/docs/reference/cli', label: 'CLI Reference' }
			]
		},
		{
			title: 'Framework',
			links: [
				{ href: '/docs/remote-functions/introduction', label: 'Remote Functions' },
				{ href: '/docs/database/introduction', label: 'Database' },
				{ href: '/docs/authentication/introduction', label: 'Authentication' },
				{ href: '/docs/payments/introduction', label: 'Payments' }
			]
		},
		{
			title: 'Community',
			links: [
				{ href: 'https://github.com/mudiageo/omnisvelte', label: 'GitHub', external: true },
				{ href: 'https://discord.gg/omnisvelte', label: 'Discord', external: true },
				{ href: '/blog', label: 'Blog' },
				{ href: '/showcase', label: 'Showcase' },
				{ href: '/docs/roadmap', label: 'Roadmap' }
			]
		},
		{
			title: 'More',
			links: [
				{ href: '/docs/reference/changelog', label: 'Changelog' },
				{ href: 'https://github.com/mudiageo/omnisvelte/blob/main/CONTRIBUTING.md', label: 'Contributing', external: true },
				{ href: 'https://github.com/mudiageo/omnisvelte/blob/main/LICENSE', label: 'MIT License', external: true }
			]
		}
	];
</script>

<footer class="border-t border-border/40 bg-background/50">
	<div class="container mx-auto max-w-screen-xl px-4 sm:px-6 pt-12 pb-8">
		<div class="grid grid-cols-2 gap-8 md:grid-cols-5 lg:grid-cols-6">
			<!-- Brand col -->
			<div class="col-span-2 lg:col-span-2">
				<a href="/" class="flex items-center gap-2 mb-4 w-fit">
					<div class="flex h-6 w-6 items-center justify-center">
						<OmniIcon class="h-3.5 w-3.5" />
					</div>
					<span class="font-bold text-sm">Omni<span class="text-violet-500">Svelte</span></span>
				</a>
				<p class="text-sm text-muted-foreground leading-relaxed max-w-[220px]">
					SvelteKit, but with superpowers. A batteries-included meta-framework for production-grade Svelte apps.
				</p>
				<div class="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
					<StatusDot status="success" pulse size="sm" />
					<span>All systems operational</span>
				</div>
				<div class="mt-4 flex items-center gap-2">
					<Badge variant="outline" class="text-xs font-mono">v0.1.0-alpha</Badge>
					<Badge variant="warning" class="text-xs">Alpha</Badge>
				</div>
				<div class="mt-5 flex items-center gap-2">
					<a href="https://github.com/mudiageo/omnisvelte" target="_blank" rel="noopener" class="text-muted-foreground hover:text-foreground transition-colors">
						<Github class="h-4 w-4" />
					</a>
				</div>
			</div>

			<!-- Link columns -->
			{#each cols as col}
				<div>
					<h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-3">{col.title}</h3>
					<ul class="space-y-2">
						{#each col.links as link}
							<li>
								<a
									href={link.href}
									target={link.external ? '_blank' : undefined}
									rel={link.external ? 'noopener noreferrer' : undefined}
									class="text-sm text-muted-foreground hover:text-foreground transition-colors"
								>
									{link.label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<Separator class="my-8" />

		<div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
			<p>© {new Date().getFullYear()} OmniSvelte. Released under the MIT License.</p>
			<p>
				Built with
				<a href="https://svelte.dev" class="hover:text-foreground transition-colors underline underline-offset-2" target="_blank">SvelteKit</a>,
				<a href="https://shadcn-svelte.com" class="hover:text-foreground transition-colors underline underline-offset-2" target="_blank">shadcn-svelte</a> &amp;
				<a href="https://velite.js.org" class="hover:text-foreground transition-colors underline underline-offset-2" target="_blank">Velite</a>
			</p>
		</div>
	</div>
</footer>
