<!-- mdsvex Doc Layout — wraps every .md file rendered by the [slug] route -->
<script lang="ts">
	let { children, title, description } = $props();
</script>

{#if title}
	<div class="mb-8 border-b border-border pb-8">
		<h1 class="mb-2 text-4xl font-bold text-foreground">{title}</h1>
		{#if description}
			<p class="text-lg text-muted-foreground">{description}</p>
		{/if}
	</div>
{/if}

{@render children()}
