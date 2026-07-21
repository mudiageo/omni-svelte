<script lang="ts">
	import { cn } from '$lib/utils.js';
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Info from '@lucide/svelte/icons/info';
	import CheckCircle from '@lucide/svelte/icons/check-circle';
	import XCircle from '@lucide/svelte/icons/x-circle';
	import Lightbulb from '@lucide/svelte/icons/lightbulb';

	let {
		type = 'info',
		title,
		children
	}: {
		type?: 'info' | 'warning' | 'danger' | 'tip' | 'note';
		title?: string;
		children?: any;
	} = $props();

	const styles = {
		info: 'border-blue-200/60 bg-blue-50/80 dark:border-blue-800/40 dark:bg-blue-950/20 text-blue-900 dark:text-blue-100',
		warning:
			'border-amber-200/60 bg-amber-50/80 dark:border-amber-800/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-100',
		danger:
			'border-red-200/60 bg-red-50/80 dark:border-red-800/40 dark:bg-red-950/20 text-red-900 dark:text-red-100',
		tip: 'border-green-200/60 bg-green-50/80 dark:border-green-800/40 dark:bg-green-950/20 text-green-900 dark:text-green-100',
		note: 'border-primary/30 bg-primary/5 dark:border-primary/30 dark:bg-primary/10 text-foreground'
	};
	const iconStyles = {
		info: 'text-blue-500',
		warning: 'text-amber-500',
		danger: 'text-red-500',
		tip: 'text-green-500',
		note: 'text-primary'
	};
	const icons = {
		info: Info,
		warning: AlertTriangle,
		danger: XCircle,
		tip: CheckCircle,
		note: Lightbulb
	};
	const defaultTitles = {
		info: 'Info',
		warning: 'Warning',
		danger: 'Danger',
		tip: 'Tip',
		note: 'Note'
	};
	const Icon = icons[type];
</script>

<div class={cn('not-prose my-5 flex gap-3 rounded-lg border p-4', styles[type])}>
	<Icon class={cn('mt-0.5 h-4 w-4 shrink-0', iconStyles[type])} />
	<div class="min-w-0 flex-1 text-sm leading-relaxed">
		<p class="mb-1 font-semibold">{title ?? defaultTitles[type]}</p>
		<div class="[&>p]:mb-0 [&>p]:opacity-90">
			{@render children?.()}
		</div>
	</div>
</div>
