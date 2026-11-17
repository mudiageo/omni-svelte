<script lang="ts">
	import type { Snippet } from 'svelte';
	let { children }: { children: Snippet } = $props();
</script>

<div class="steps border-border relative mb-12 ml-4 border-l pl-8 [counter-reset:step]">
	{@render children()}
</div>
