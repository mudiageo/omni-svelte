<script lang="ts">
	interface Prop {
		name: string;
		type: string;
		default?: string;
		description: string;
		required?: boolean;
	}
	let { props }: { props: Prop[] } = $props();
</script>

<div class="border-border my-6 overflow-x-auto rounded-lg border">
	<table class="w-full text-sm">
		<thead>
			<tr class="border-border bg-muted/50 border-b">
				<th
					class="text-muted-foreground px-4 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
					>Prop</th
				>
				<th
					class="text-muted-foreground px-4 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
					>Type</th
				>
				<th
					class="text-muted-foreground px-4 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
					>Default</th
				>
				<th
					class="text-muted-foreground px-4 py-2.5 text-left text-xs font-semibold tracking-wider uppercase"
					>Description</th
				>
			</tr>
		</thead>
		<tbody>
			{#each props as prop, i}
				<tr class="border-border/50 even:bg-muted/20 border-b last:border-0">
					<td class="px-4 py-2.5 font-mono text-xs">
						<span class="text-foreground">{prop.name}</span>
						{#if prop.required}
							<span class="ml-1 text-red-500">*</span>
						{/if}
					</td>
					<td class="text-primary px-4 py-2.5 font-mono text-xs">{prop.type}</td>
					<td class="text-muted-foreground px-4 py-2.5 font-mono text-xs">{prop.default ?? '—'}</td>
					<td class="text-muted-foreground px-4 py-2.5 text-xs leading-relaxed"
						>{prop.description}</td
					>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
