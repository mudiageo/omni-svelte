<!-- mdsvex Doc Layout — wraps every .md file rendered by the [slug] route -->
<script lang="ts">
	let { children, title, description } = $props();
</script>

{#if title}
	<div class="mb-8 border-b border-slate-200 pb-8 dark:border-slate-800">
		<h1 class="mb-2 text-4xl font-bold text-slate-900 dark:text-white">{title}</h1>
		{#if description}
			<p class="text-lg text-slate-500 dark:text-slate-400">{description}</p>
		{/if}
	</div>
{/if}

{@render children()}
