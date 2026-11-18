<script lang="ts">
	let { children }: { children: any } = $props();
</script>

<div class="border-border bg-muted/50 flex border-b px-2">
	{@render children?.()}
</div>
