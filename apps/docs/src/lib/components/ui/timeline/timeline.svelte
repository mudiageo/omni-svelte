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

<div class={cn('relative flex flex-col', className)}>
	<div class="absolute top-0 bottom-0 left-[11.5px] w-px bg-border" />
	{@render children()}
</div>
