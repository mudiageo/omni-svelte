<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="my-8 grid grid-cols-1 gap-4 md:grid-cols-3">
	{@render children()}
</div>
