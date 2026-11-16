<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Auth Tables Demo - OmniSvelte</title>
</svelte:head>

<div class="mx-auto max-w-4xl p-6">
	<div class="mb-8 border-b pb-4">
		<h1 class="text-3xl font-bold tracking-tight">Auth Tables & Inverse Relations Demo</h1>
		<p class="mt-2 text-muted-foreground">
			Demonstrating <code>field.reference(() =&gt; auth.user)</code>, read-only auth models, and
			virtual inverse relations.
		</p>
	</div>

	{#if data.status === 'offline'}
		<div class="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
			<h3 class="font-semibold">Fixture Mode</h3>
			<p class="text-sm mt-1">
				Database is currently disconnected. Schema validation and types are fully verified.
			</p>
		</div>
	{:else}
		<div class="space-y-6">
			{#each data.users as user}
				<div class="rounded-lg border bg-card p-4 shadow-sm">
					<div class="flex items-center justify-between">
						<div>
							<h3 class="font-semibold text-lg">{user.name}</h3>
							<p class="text-sm text-muted-foreground">{user.email}</p>
						</div>
						<span class="rounded bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
							ID: {user.id}
						</span>
					</div>

					{#if (user as any).profile}
						<div class="mt-3 border-t pt-2 text-sm">
							<span class="font-medium">Bio:</span> {(user as any).profile.bio || 'No bio'}
						</div>
					{/if}

					{#if (user as any).notes && (user as any).notes.length > 0}
						<div class="mt-3 border-t pt-2">
							<h4 class="text-xs font-semibold uppercase text-muted-foreground">Notes</h4>
							<ul class="mt-1 list-inside list-disc text-sm">
								{#each (user as any).notes as note}
									<li>{note.body}</li>
								{/each}
							</ul>
						</div>
					{/if}
				</div>
			{:else}
				<p class="text-muted-foreground">No users found in database.</p>
			{/each}
		</div>
	{/if}
</div>
