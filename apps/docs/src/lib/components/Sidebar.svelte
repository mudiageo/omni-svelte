<script lang="ts">
	import { nav, type NavItem } from '$lib/nav';

	let { currentPath }: { currentPath: string } = $props();

	function isActive(item: NavItem): boolean {
		if (!item.slug) return false;
		return currentPath.endsWith(item.slug);
	}
</script>

<nav class="h-full overflow-y-auto px-4 py-6">
	{#each nav as section}
		<div class="mb-6">
			<div class="mb-2 flex items-center gap-2">
				<p class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
					{section.title}
				</p>
				{#if section.badge}
					<span
						class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
					>
						{section.badge}
					</span>
				{/if}
			</div>

			{#if section.children}
				<ul class="space-y-0.5">
					{#each section.children as item}
						<li>
							<a
								href="/docs/{item.slug}"
								class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors"
								class:bg-primary/10={isActive(item)}
								class:text-primary={isActive(item)}
								class:font-medium={isActive(item)}
								class:text-muted-foreground={!isActive(item)}
								class:hover:bg-muted={!isActive(item)}
								class:hover:text-foreground={!isActive(item)}
							>
								{item.title}
								{#if item.badge}
									<span
										class="ml-auto rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
									>
										{item.badge}
									</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}
</nav>
