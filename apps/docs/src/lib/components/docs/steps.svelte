<script lang="ts">
	let { children }: { children: any } = $props();
</script>

<div class="ml-4 mt-4 border-l-2 border-primary/30 pl-6 [counter-reset:step] space-y-8 mb-6">
	{@render children?.()}
</div>
