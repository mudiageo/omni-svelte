<script lang="ts">
	import { File as FileIcon } from '@lucide/svelte';
	let { name, highlight = false }: { name: string, highlight?: boolean } = $props();
</script>
<li class="flex items-center gap-2 {highlight ? 'font-semibold text-primary' : 'text-muted-foreground'}">
	<FileIcon class="h-4 w-4 shrink-0 opacity-80" />
	<span>{name}</span>
</li>
