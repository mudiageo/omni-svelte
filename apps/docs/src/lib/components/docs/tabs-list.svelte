<script lang="ts">
	let { children }: { children: any } = $props();
</script>

<div class="flex border-b border-border bg-muted/50 px-2">
	{@render children?.()}
</div>
