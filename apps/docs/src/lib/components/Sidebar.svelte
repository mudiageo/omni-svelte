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
				<p class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
					{section.title}
				</p>
				{#if section.badge}
					<span
						class="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
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
								class:bg-brand-50={isActive(item)}
								class:text-brand-700={isActive(item)}
								class:font-medium={isActive(item)}
								class:dark:bg-brand-950={isActive(item)}
								class:dark:text-brand-300={isActive(item)}
								class:text-slate-600={!isActive(item)}
								class:hover:bg-slate-100={!isActive(item)}
								class:hover:text-slate-900={!isActive(item)}
								class:dark:text-slate-400={!isActive(item)}
								class:dark:hover:bg-slate-800={!isActive(item)}
								class:dark:hover:text-slate-100={!isActive(item)}
							>
								{item.title}
								{#if item.badge}
									<span
										class="ml-auto rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400"
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
