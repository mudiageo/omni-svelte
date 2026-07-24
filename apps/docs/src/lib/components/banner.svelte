<script lang="ts">
	import { bannerConfig } from '$lib/config.js';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
</script>

{#if bannerConfig.enabled}
	<a
		href={bannerConfig.link}
		class="group block bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
	>
		<span class="inline-flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3">
			<span>{bannerConfig.message}</span>
			<span class="inline-flex items-center gap-1 font-semibold underline underline-offset-4">
				{bannerConfig.linkLabel}
				<ArrowRight class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
			</span>
		</span>
	</a>
{/if}
