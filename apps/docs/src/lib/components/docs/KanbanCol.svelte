<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, children }: { title: string, children: Snippet } = $props();
</script>
<div class="flex flex-col gap-3 rounded-lg border bg-muted/20 p-4">
	<div class="flex items-center gap-2 font-semibold">
		{title}
	</div>
	<div class="flex flex-col gap-2">
		{@render children()}
	</div>
</div>
