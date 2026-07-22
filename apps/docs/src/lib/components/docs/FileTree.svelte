<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>
<div class="my-6 rounded-xl border bg-muted/10 p-4 font-mono text-sm shadow-sm overflow-x-auto">
	<ul class="flex flex-col gap-1.5">
		{@render children()}
	</ul>
</div>
