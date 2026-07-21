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

<div class="my-6 overflow-x-auto rounded-lg border border-border">
	<table class="w-full text-sm">
		<thead>
			<tr class="border-b border-border bg-muted/50">
				<th class="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Prop</th>
				<th class="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Type</th>
				<th class="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Default</th>
				<th class="px-4 py-2.5 text-left font-semibold text-xs uppercase tracking-wider text-muted-foreground">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each props as prop, i}
				<tr class="border-b border-border/50 last:border-0 even:bg-muted/20">
					<td class="px-4 py-2.5 font-mono text-xs">
						<span class="text-foreground">{prop.name}</span>
						{#if prop.required}
							<span class="ml-1 text-red-500">*</span>
						{/if}
					</td>
					<td class="px-4 py-2.5 font-mono text-xs text-primary">{prop.type}</td>
					<td class="px-4 py-2.5 font-mono text-xs text-muted-foreground">{prop.default ?? '—'}</td>
					<td class="px-4 py-2.5 text-muted-foreground text-xs leading-relaxed">{prop.description}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
