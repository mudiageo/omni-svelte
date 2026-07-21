<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		class: className,
		children
	}: {
		class?: string;
		children: Snippet;
	} = $props();
</script>

<div class={cn('ml-4 flex flex-1 flex-col gap-1 pt-0.5', className)}>
	{@render children()}
</div>
