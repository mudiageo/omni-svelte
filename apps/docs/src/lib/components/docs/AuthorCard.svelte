<script lang="ts">
	import { Github, Twitter } from '@lucide/svelte';
	let {
		name,
		role,
		avatar,
		github,
		twitter
	}: { name: string; role?: string; avatar?: string; github?: string; twitter?: string } = $props();
</script>

<div class="bg-card my-6 flex items-center gap-4 rounded-xl border p-4 shadow-sm">
	{#if avatar}
		<img src={avatar} alt={name} class="h-12 w-12 rounded-full border object-cover" />
	{:else}
		<div
			class="bg-primary/10 text-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-xl font-bold"
		>
			{name.charAt(0)}
		</div>
	{/if}
	<div class="flex flex-col">
		<span class="font-semibold">{name}</span>
		{#if role}
			<span class="text-muted-foreground text-sm">{role}</span>
		{/if}
	</div>
	<div class="ml-auto flex gap-2">
		{#if github}
			<a
				href={github}
				target="_blank"
				rel="noopener noreferrer"
				class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors"
			>
				<Github class="h-4 w-4" />
			</a>
		{/if}
		{#if twitter}
			<a
				href={twitter}
				target="_blank"
				rel="noopener noreferrer"
				class="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-2 transition-colors"
			>
				<Twitter class="h-4 w-4" />
			</a>
		{/if}
	</div>
</div>
