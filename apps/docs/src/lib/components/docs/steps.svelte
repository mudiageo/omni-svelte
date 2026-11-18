<script lang="ts">
	let { children }: { children: any } = $props();
</script>

<div class="border-primary/30 mt-4 mb-6 ml-4 space-y-8 border-l-2 pl-6 [counter-reset:step]">
	{@render children?.()}
</div>
