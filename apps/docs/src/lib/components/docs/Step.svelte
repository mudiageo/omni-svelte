<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, children }: { title: string, children: Snippet } = $props();
</script>

<div class="step relative mt-8 [counter-increment:step]">
	<div class="absolute -left-[49px] mt-1 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-sm font-medium">
		<span class="after:content-[counter(step)]"></span>
	</div>
	<h3 class="mt-0 text-xl font-semibold tracking-tight">{title}</h3>
	<div class="mt-4 text-muted-foreground prose-p:my-4">
		{@render children()}
	</div>
</div>
