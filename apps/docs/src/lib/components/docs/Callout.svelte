<script lang="ts">
	import { AlertTriangle, Info, CheckCircle2, XCircle } from '@lucide/svelte';
	import type { Snippet } from 'svelte';

	let { type = 'info', title, children }: { type?: 'info' | 'warning' | 'success' | 'error', title?: string, children: Snippet } = $props();

	const variants = {
		info: 'bg-blue-500/10 text-blue-900 border-blue-500/20 dark:text-blue-200',
		warning: 'bg-yellow-500/10 text-yellow-900 border-yellow-500/20 dark:text-yellow-200',
		success: 'bg-green-500/10 text-green-900 border-green-500/20 dark:text-green-200',
		error: 'bg-red-500/10 text-red-900 border-red-500/20 dark:text-red-200'
	};

	const icons = {
		info: Info,
		warning: AlertTriangle,
		success: CheckCircle2,
		error: XCircle
	};

	const Icon = icons[type];
</script>

<div class="my-6 flex items-start gap-4 rounded-xl border p-4 {variants[type]}">
	<div class="mt-0.5 shrink-0">
		<Icon class="h-5 w-5" />
	</div>
	<div class="flex-1 space-y-2 leading-relaxed">
		{#if title}
			<h5 class="font-semibold">{title}</h5>
		{/if}
		<div class="text-sm opacity-90 prose-p:my-0 prose-p:leading-relaxed">
			{@render children()}
		</div>
	</div>
</div>
