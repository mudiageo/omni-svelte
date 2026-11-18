<script lang="ts">
	import { cn } from '#lib/utils.js';
	import type { Snippet } from 'svelte';

	let { class: className, children }: { class?: string; children: Snippet } = $props();
</script>

<p class={cn('text-muted-foreground mb-0.5 text-xs', className)}>
	{@render children()}
</p>
