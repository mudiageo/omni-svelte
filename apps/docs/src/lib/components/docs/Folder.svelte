<script lang="ts">
	import { Folder as FolderIcon, FolderOpen } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	let { name, defaultOpen = true, children }: { name: string, defaultOpen?: boolean, children?: Snippet } = $props();
	let open = $state(defaultOpen);
</script>
<li class="flex flex-col gap-1.5">
	<button class="flex items-center gap-2 hover:text-primary transition-colors cursor-pointer text-left" onclick={() => open = !open}>
		{#if open}
			<FolderOpen class="h-4 w-4 text-blue-500 shrink-0" />
		{:else}
			<FolderIcon class="h-4 w-4 text-blue-500 shrink-0" />
		{/if}
		<span class="font-medium text-foreground/90">{name}</span>
	</button>
	{#if open && children}
		<ul class="ml-2 flex flex-col gap-1.5 border-l-2 border-muted/50 pl-4 mt-1.5">
			{@render children()}
		</ul>
	{/if}
</li>
