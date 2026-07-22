<script lang="ts">
	import { Database, Server, Smartphone, ArrowRight } from '@lucide/svelte';
</script>

<div class="my-6 flex flex-col items-center gap-4 rounded-xl border bg-muted/20 p-8 sm:flex-row sm:justify-center">
	<div class="flex flex-col items-center gap-2 rounded-lg border bg-background p-4 shadow-sm">
		<Smartphone class="h-6 w-6 text-primary" />
		<span class="text-xs font-semibold">Client (SvelteKit)</span>
	</div>
	<ArrowRight class="h-5 w-5 rotate-90 text-muted-foreground sm:rotate-0" />
	<div class="flex flex-col items-center gap-2 rounded-lg border bg-background p-4 shadow-sm">
		<Server class="h-6 w-6 text-primary" />
		<span class="text-xs font-semibold">Remote Function</span>
	</div>
	<ArrowRight class="h-5 w-5 rotate-90 text-muted-foreground sm:rotate-0" />
	<div class="flex flex-col items-center gap-2 rounded-lg border bg-background p-4 shadow-sm">
		<Database class="h-6 w-6 text-primary" />
		<span class="text-xs font-semibold">Database Model</span>
	</div>
</div>
