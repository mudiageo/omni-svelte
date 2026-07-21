<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Badge } from '$lib/components/ui/badge';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { docsNav } from '$lib/docs-nav.js';
	import { cn } from '$lib/utils.js';
	import OmniIcon from '$lib/icons/favicon.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';

	function isActive(href: string | undefined) {
		return href ? page.url.pathname === href : false;
	}
	function isSectionActive(items: (typeof docsNav)[0]['items']) {
		return items.some((i) => page.url.pathname === i.href);
	}

	const badgeVariant: Record<string, 'secondary' | 'outline'> = {
		soon: 'secondary',
		wip: 'outline',
		beta: 'secondary',
		new: 'secondary'
	};
</script>

<Sidebar.Root variant="inset">
	<Sidebar.Header class="pb-0">
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton size="lg" href="/" class="h-12">
					{#snippet child({ props })}
						<a href="/" {...props}>
							<div
								class="flex aspect-square h-8 w-8 items-center justify-center rounded-lg shadow-sm"
							>
								<OmniIcon class="h-4 w-4" />
							</div>
							<div class="flex flex-col gap-0.5 leading-none">
								<span class="font-semibold">OmniSvelte</span>
								<span class="text-xs text-muted-foreground">v0.1.0-alpha</span>
							</div>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Header>

	<Sidebar.Content class="mt-2">
		<!-- Search hint -->
		<div class="px-2 pb-2">
			<button
				class="flex w-full items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-3.5 w-3.5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<span class="flex-1 text-left text-xs">Search docs...</span>
				<kbd
					class="pointer-events-none hidden rounded border bg-background px-1.5 py-0.5 font-mono text-[10px] opacity-100 select-none sm:inline-flex"
					>⌘K</kbd
				>
			</button>
		</div>

		{#each docsNav as section}
			<Collapsible.Root open={isSectionActive(section.items)} class="group/collapsible">
				<Sidebar.Group class="py-0">
					<Sidebar.GroupLabel
						class="group/label flex cursor-pointer items-center text-[11px] tracking-widest text-muted-foreground/60 uppercase transition-colors hover:text-foreground"
						asChild
					>
						{#snippet child({ props })}
							<Collapsible.Trigger {...props}>
								{section.title}
								<ChevronRight
									class="ml-auto h-3 w-3 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
								/>
							</Collapsible.Trigger>
						{/snippet}
					</Sidebar.GroupLabel>

					<Collapsible.Content>
						<Sidebar.GroupContent>
							<Sidebar.Menu>
								{#each section.items as item}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton
											isActive={isActive(item.href)}
											href={item.href}
											class={cn(
												'h-8 text-sm',
												isActive(item.href)
													? 'bg-sidebar-accent font-medium text-sidebar-primary'
													: 'text-sidebar-foreground/70'
											)}
										>
											{#snippet child({ props })}
												<a href={item.href ?? '#'} {...props}>
													<span>{item.title}</span>
													{#if item.label}
														<Badge
															variant={badgeVariant[item.label] ?? 'secondary'}
															class="ml-auto h-3.5 px-1 py-0 text-[9px] font-semibold tracking-wider uppercase"
														>
															{item.label}
														</Badge>
													{/if}
												</a>
											{/snippet}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/each}
							</Sidebar.Menu>
						</Sidebar.GroupContent>
					</Collapsible.Content>
				</Sidebar.Group>
			</Collapsible.Root>
		{/each}
	</Sidebar.Content>

	<Sidebar.Footer>
		<Sidebar.Menu>
			<Sidebar.MenuItem>
				<Sidebar.MenuButton
					href="https://github.com/mudiageo/omni-svelte"
					target="_blank"
					rel="noopener"
				>
					{#snippet child({ props })}
						<a
							href="https://github.com/mudiageo/omni-svelte"
							target="_blank"
							rel="noopener"
							{...props}
						>
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
								<path
									d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12"
								/>
							</svg>
							<span>GitHub</span>
						</a>
					{/snippet}
				</Sidebar.MenuButton>
			</Sidebar.MenuItem>
		</Sidebar.Menu>
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
