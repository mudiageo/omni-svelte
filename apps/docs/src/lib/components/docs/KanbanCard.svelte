<script lang="ts">
	let {
		title,
		description,
		tags = []
	}: { title: string; description?: string; tags?: string[] } = $props();
</script>

<div class="bg-background flex flex-col gap-2 rounded-md border p-3 shadow-sm">
	<span class="text-sm font-medium">{title}</span>
	{#if description}
		<span class="text-muted-foreground text-xs">{description}</span>
	{/if}
	{#if tags.length > 0}
		<div class="mt-1 flex flex-wrap gap-1">
			{#each tags as tag}
				<span
					class="bg-secondary text-secondary-foreground rounded-sm px-1.5 py-0.5 text-[10px] font-medium"
					>{tag}</span
				>
			{/each}
		</div>
	{/if}
</div>
