<script lang="ts">
	import { Folder as FolderIcon, FolderOpen } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	let {
		name,
		defaultOpen = true,
		children
	}: { name: string; defaultOpen?: boolean; children?: Snippet } = $props();
	let open = $state(defaultOpen);
</script>

<li class="flex flex-col gap-1.5">
	<button
		class="flex cursor-pointer items-center gap-2 text-left transition-colors hover:text-primary"
		onclick={() => (open = !open)}
	>
		{#if open}
			<FolderOpen class="h-4 w-4 shrink-0 text-blue-500" />
		{:else}
			<FolderIcon class="h-4 w-4 shrink-0 text-blue-500" />
		{/if}
		<span class="font-medium text-foreground/90">{name}</span>
	</button>
	{#if open && children}
		<ul class="mt-1.5 ml-2 flex flex-col gap-1.5 border-l-2 border-muted/50 pl-4">
			{@render children()}
		</ul>
	{/if}
</li>
