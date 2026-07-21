<script lang="ts">
	import { cn } from '$lib/utils.js';

	let {
		items,
		class: className
	}: {
		items: Array<{
			date?: string;
			title: string;
			description?: string;
			icon?: any;
			variant?: 'default' | 'success' | 'warning' | 'error';
		}>;
		class?: string;
	} = $props();

	const dotColors = {
		default: 'bg-primary border-primary/30',
		success: 'bg-green-500 border-green-200 dark:border-green-900',
		warning: 'bg-amber-500 border-amber-200 dark:border-amber-900',
		error: 'bg-red-500 border-red-200 dark:border-red-900'
	};
</script>

<div class={cn('relative space-y-0', className)}>
	{#each items as item, i}
		<div class="relative flex gap-4 pb-8 last:pb-0">
			<!-- Line -->
			{#if i < items.length - 1}
				<div class="absolute top-6 bottom-0 left-[11px] w-px bg-border"></div>
			{/if}

			<!-- Dot -->
			<div
				class={cn(
					'relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
					dotColors[item.variant ?? 'default']
				)}
			>
				{#if item.icon}
					<item.icon class="h-3 w-3 text-white" />
				{:else}
					<div class="h-1.5 w-1.5 rounded-full bg-white"></div>
				{/if}
			</div>

			<!-- Content -->
			<div class="flex-1 pt-0.5 pb-1">
				{#if item.date}
					<p class="mb-1 text-xs font-medium text-muted-foreground">{item.date}</p>
				{/if}
				<h4 class="text-sm leading-tight font-semibold">{item.title}</h4>
				{#if item.description}
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
				{/if}
			</div>
		</div>
	{/each}
</div>
