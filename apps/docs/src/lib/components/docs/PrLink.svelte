<script lang="ts">
	import { GitPullRequest } from '@lucide/svelte';
	let { href, num }: { href: string; num: string | number } = $props();
</script>

<a
	{href}
	target="_blank"
	rel="noopener noreferrer"
	class="bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium no-underline transition-colors"
>
	<GitPullRequest class="h-3 w-3" />
	#{num}
</a>
