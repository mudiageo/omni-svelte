<!-- mdsvex Doc Layout — wraps every .md file rendered by the [slug] route -->
<script lang="ts">
	let { children, title, description } = $props();
</script>

{#if title}
	<div class="border-border mb-8 border-b pb-8">
		<h1 class="text-foreground mb-2 text-4xl font-bold">{title}</h1>
		{#if description}
			<p class="text-muted-foreground text-lg">{description}</p>
		{/if}
	</div>
{/if}

{@render children()}
