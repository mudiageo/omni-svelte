<script lang="ts">
	import { nav, type NavItem } from '$lib/nav';

	let { currentPath }: { currentPath: string } = $props();

	function isActive(item: NavItem): boolean {
		if (!item.slug) return false;
		return currentPath.endsWith(item.slug);
	}
</script>

<nav class="px-4 py-6 h-full overflow-y-auto">
	{#each nav as section}
		<div class="mb-6">
			<div class="mb-2 gap-2 flex items-center">
				<p
					class="text-xs font-semibold tracking-wider text-slate-500 dark:text-slate-400 uppercase"
				>
					{section.title}
				</p>
				{#if section.badge}
					<span
						class="bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300 px-1.5 py-0.5 font-semibold rounded-full text-[10px]"
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
								class="gap-2 rounded-lg px-3 py-2 text-sm flex items-center transition-colors"
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
										class="bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400 ml-auto rounded-full text-[10px]"
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
