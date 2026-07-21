<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Terminal from '@lucide/svelte/icons/terminal';
	import { cn } from '$lib/utils.js';
	import { Button } from '$lib/components/ui/button';

	let { children, 'data-language': lang, ...rest }: { children?: any; 'data-language'?: string; [k: string]: any } = $props();
	let copied = $state(false);
	let preEl: HTMLElement;

	function copyCode() {
		navigator.clipboard.writeText(preEl?.textContent ?? '').then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<div class="relative group my-5 rounded-lg overflow-hidden border border-zinc-800 dark:border-zinc-700/50 bg-zinc-950 dark:bg-[#0d1117]">
	<!-- Header bar -->
	<div class="flex items-center justify-between px-4 py-2 border-b border-zinc-800/80 bg-zinc-900/80">
		<div class="flex items-center gap-2">
			<Terminal class="h-3.5 w-3.5 text-zinc-500" />
			{#if lang}
				<span class="text-xs text-zinc-400 font-mono">{lang}</span>
			{/if}
		</div>
		<Button
			variant="ghost"
			size="icon"
			onclick={copyCode}
			class="h-6 w-6 text-zinc-400 hover:text-white hover:bg-zinc-700/60 rounded"
			aria-label="Copy code"
		>
			{#if copied}
				<Check class="h-3.5 w-3.5 text-green-400" />
			{:else}
				<Copy class="h-3.5 w-3.5" />
			{/if}
		</Button>
	</div>
	<pre bind:this={preEl} class="overflow-x-auto p-4 text-sm font-mono leading-relaxed" {...rest}>{@render children?.()}</pre>
</div>
