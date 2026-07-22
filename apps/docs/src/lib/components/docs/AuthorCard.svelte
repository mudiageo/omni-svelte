<script lang="ts">
	import { Github, Twitter } from '@lucide/svelte';
	let { name, role, avatar, github, twitter }: { name: string, role?: string, avatar?: string, github?: string, twitter?: string } = $props();
</script>
<div class="my-6 flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
	{#if avatar}
		<img src={avatar} alt={name} class="h-12 w-12 rounded-full object-cover border" />
	{:else}
		<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
			{name.charAt(0)}
		</div>
	{/if}
	<div class="flex flex-col">
		<span class="font-semibold">{name}</span>
		{#if role}
			<span class="text-sm text-muted-foreground">{role}</span>
		{/if}
	</div>
	<div class="ml-auto flex gap-2">
		{#if github}
			<a href={github} target="_blank" rel="noopener noreferrer" class="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
				<Github class="h-4 w-4" />
			</a>
		{/if}
		{#if twitter}
			<a href={twitter} target="_blank" rel="noopener noreferrer" class="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
				<Twitter class="h-4 w-4" />
			</a>
		{/if}
	</div>
</div>
