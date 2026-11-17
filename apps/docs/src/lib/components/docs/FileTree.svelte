<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="bg-muted/10 my-6 overflow-x-auto rounded-xl border p-4 font-mono text-sm shadow-sm">
	<ul class="flex flex-col gap-1.5">
		{@render children()}
	</ul>
</div>
