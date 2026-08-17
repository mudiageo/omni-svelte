<script lang="ts">
	import { cn } from '#lib/utils.js';
	import type { Snippet } from 'svelte';

	let { class: className, children }: { class?: string; children: Snippet } = $props();
</script>

<h3 class={cn('text-sm leading-none font-semibold tracking-tight', className)}>
	{@render children()}
</h3>
