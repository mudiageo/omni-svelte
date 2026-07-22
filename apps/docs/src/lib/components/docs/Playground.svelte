<script lang="ts">
	import { Terminal, Play } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { title = 'Playground', code, preview }: { title?: string, code: Snippet, preview: Snippet } = $props();
	
	let activeTab = $state<'code' | 'preview'>('preview');
</script>

<div class="my-6 overflow-hidden rounded-xl border bg-background shadow-sm">
	<div class="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
		<div class="text-sm font-medium text-muted-foreground">
			{title}
		</div>
		<div class="flex gap-1">
			<button
				class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors {activeTab === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}"
				onclick={() => activeTab = 'preview'}
			>
				<Play class="h-3.5 w-3.5" />
				Preview
			</button>
			<button
				class="flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors {activeTab === 'code' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted'}"
				onclick={() => activeTab = 'code'}
			>
				<Terminal class="h-3.5 w-3.5" />
				Code
			</button>
		</div>
	</div>
	<div class="p-0">
		<div class={activeTab === 'preview' ? 'block p-6' : 'hidden'}>
			{@render preview()}
		</div>
		<div class={activeTab === 'code' ? 'block [&_pre]:m-0 [&_pre]:rounded-none [&_pre]:border-0' : 'hidden'}>
			{@render code()}
		</div>
	</div>
</div>
