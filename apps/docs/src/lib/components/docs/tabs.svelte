<script lang="ts">
	let { children }: { children: any } = $props();
	let activeTab = $state(0);

	// We pass context down via a simple store pattern
	import { setContext } from 'svelte';
	setContext('tabs', {
		get activeTab() {
			return activeTab;
		},
		setTab: (i: number) => (activeTab = i)
	});
</script>

<div class="border-border my-4 overflow-hidden rounded-lg border">
	{@render children?.()}
</div>
