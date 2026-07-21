<script lang="ts">
	let { children, title }: { children: any; title?: string } = $props();
</script>

<div class="relative mb-0 [counter-increment:step]">
	<div
		class="absolute -left-[2.85rem] flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-xs font-bold text-primary dark:border-primary/50"
		style="content: counter(step)"
	>
		<span class="select-none" aria-hidden="true">
			<!-- show step number via CSS counter -->
		</span>
		<style>
			div::before {
				content: counter(step);
			}
		</style>
	</div>
	{#if title}
		<h3 class="mb-2 font-semibold">{title}</h3>
	{/if}
	<div class="[&>p]:text-muted-foreground">
		{@render children?.()}
	</div>
</div>
