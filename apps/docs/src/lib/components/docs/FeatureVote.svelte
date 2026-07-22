<script lang="ts">
	import { ChevronUp } from '@lucide/svelte';
	let { title, description, initialVotes = 0 }: { title: string, description: string, initialVotes?: number } = $props();

	let votes = $state(initialVotes);
	let voted = $state(false);

	function toggleVote() {
		if (voted) {
			votes--;
			voted = false;
		} else {
			votes++;
			voted = true;
		}
	}
</script>

<div class="my-4 flex items-start justify-between gap-4 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/5">
	<div class="flex flex-col gap-1">
		<h4 class="m-0 font-semibold leading-none tracking-tight">{title}</h4>
		<p class="m-0 text-sm text-muted-foreground">{description}</p>
	</div>
	<button
		class="flex shrink-0 flex-col items-center justify-center rounded-md border px-3 py-2 transition-all {voted ? 'border-primary bg-primary/10 text-primary' : 'bg-background hover:bg-muted'}"
		onclick={toggleVote}
	>
		<ChevronUp class="h-5 w-5 {voted ? 'text-primary' : 'text-muted-foreground'}" />
		<span class="text-sm font-bold">{votes}</span>
	</button>
</div>
