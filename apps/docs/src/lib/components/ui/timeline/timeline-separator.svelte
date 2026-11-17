<script lang="ts">
	import { cn } from '#lib/utils.js';
	import type { Snippet } from 'svelte';

	let {
		class: className,
		children
	}: {
		class?: string;
		children?: Snippet;
	} = $props();
</script>

<div
	class={cn(
		'bg-background relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border shadow-sm',
		className
	)}
>
	{#if children}
		{@render children()}
	{:else}
		<div class="bg-primary h-1.5 w-1.5 rounded-full" />
	{/if}
</div>
