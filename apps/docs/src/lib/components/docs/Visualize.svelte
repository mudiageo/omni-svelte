<script lang="ts">
	import { Database, Server, Smartphone, ArrowRight } from '@lucide/svelte';
</script>

<div
	class="bg-muted/20 my-6 flex flex-col items-center gap-4 rounded-xl border p-8 sm:flex-row sm:justify-center"
>
	<div class="bg-background flex flex-col items-center gap-2 rounded-lg border p-4 shadow-sm">
		<Smartphone class="text-primary h-6 w-6" />
		<span class="text-xs font-semibold">Client (SvelteKit)</span>
	</div>
	<ArrowRight class="text-muted-foreground h-5 w-5 rotate-90 sm:rotate-0" />
	<div class="bg-background flex flex-col items-center gap-2 rounded-lg border p-4 shadow-sm">
		<Server class="text-primary h-6 w-6" />
		<span class="text-xs font-semibold">Remote Function</span>
	</div>
	<ArrowRight class="text-muted-foreground h-5 w-5 rotate-90 sm:rotate-0" />
	<div class="bg-background flex flex-col items-center gap-2 rounded-lg border p-4 shadow-sm">
		<Database class="text-primary h-6 w-6" />
		<span class="text-xs font-semibold">Database Model</span>
	</div>
</div>
