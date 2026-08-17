<script lang="ts">
	import { bannerConfig } from '#lib/config.js';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import X from '@lucide/svelte/icons/x';

	let visible = $state(bannerConfig.enabled);
</script>

{#if visible}
	<div
		class="group relative block bg-primary text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
	>
		<a
			href={bannerConfig.link}
			class="flex w-full items-center justify-center px-4 py-2 outline-none"
		>
			<span class="inline-flex flex-col items-center gap-1.5 sm:flex-row sm:gap-3">
				<span>{bannerConfig.message}</span>
				<span class="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
					{bannerConfig.linkLabel}
					<ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
				</span>
			</span>
		</a>
		<button
			onclick={() => (visible = false)}
			class="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 opacity-70 hover:bg-black/10 hover:opacity-100 focus:outline-none dark:hover:bg-white/10"
			aria-label="Dismiss banner"
		>
			<X class="h-4 w-4" />
		</button>
	</div>
{/if}
