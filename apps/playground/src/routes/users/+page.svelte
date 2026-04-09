<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	export let data;
	export let form;

	let searchValue = data.search;

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();

		const params = new URLSearchParams(page.url.searchParams);
		if (searchValue) {
			params.set('search', searchValue);
		} else {
			params.delete('search');
		}
		params.delete('page'); // Reset to first page on search
		goto(`?${params.toString()}`);
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<div class="p-6 container mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Users</h1>
		<a href="/users/create" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
			Create User
		</a>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded border-red-400 bg-red-100 px-4 py-3 text-red-700 border">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="mb-4 rounded border-green-400 bg-green-100 px-4 py-3 text-green-700 border">
			{form.message}
		</div>
	{/if}

	<!-- Search -->
	<div class="mb-6">
		<form onsubmit={handleSearch} class="gap-2 flex">
			<input
				type="text"
				bind:value={searchValue}
				placeholder="Search users by name or email..."
				class="rounded px-3 py-2 flex-1 border"
			/>
			<button type="submit" class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
				Search
			</button>
		</form>
	</div>

	<!-- Users Table -->
	<div class="rounded-lg bg-white shadow overflow-hidden">
		<table class="min-w-full">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-xs font-medium text-gray-500 text-left uppercase">Name</th>
					<th class="px-6 py-3 text-xs font-medium text-gray-500 text-left uppercase">Email</th>
					<th class="px-6 py-3 text-xs font-medium text-gray-500 text-left uppercase">Status</th>
					<th class="px-6 py-3 text-xs font-medium text-gray-500 text-left uppercase">Created</th>
					<th class="px-6 py-3 text-xs font-medium text-gray-500 text-left uppercase">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-gray-200 divide-y">
				{#each data.users.data as user}
					<tr>
						<td class="px-6 py-4 whitespace-nowrap">
							<a href="/users/{user.id}" class="font-medium text-blue-600 hover:text-blue-800">
								{user.name}
							</a>
						</td>
						<td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
							{user.email}
						</td>
						<td class="px-6 py-4 whitespace-nowrap">
							<span
								class="px-2 py-1 text-xs rounded-full {user.active
									? 'bg-green-100 text-green-800'
									: 'bg-red-100 text-red-800'}"
							>
								{user.active ? 'Active' : 'Inactive'}
							</span>
						</td>
						<td class="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
							{new Date(user.created_at).toLocaleDateString()}
						</td>
						<td class="space-x-2 px-6 py-4 text-sm whitespace-nowrap">
							<a href="/users/{user.id}/edit" class="text-blue-600 hover:text-blue-800">Edit</a>

							<form
								method="POST"
								action="?/toggle_active"
								class="inline"
								use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										await invalidateAll();
									};
								}}
							>
								<input type="hidden" name="id" value={user.id} />
								<button type="submit" class="text-yellow-600 hover:text-yellow-800">
									{user.active ? 'Deactivate' : 'Activate'}
								</button>
							</form>

							<form
								method="POST"
								action="?/delete"
								class="inline"
								use:enhance={() => {
									return async ({ result, update }) => {
										if (confirm('Are you sure you want to delete this user?')) {
											await update();
											await invalidateAll();
										}
									};
								}}
							>
								<input type="hidden" name="id" value={user.id} />
								<button type="submit" class="text-red-600 hover:text-red-800">Delete</button>
							</form>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>

		{#if data.users.data.length === 0}
			<div class="py-8 text-gray-500 text-center">No users found.</div>
		{/if}
	</div>

	<!-- Pagination -->
	{#if data.users.meta.last_page > 1}
		<div class="mt-6 flex items-center justify-between">
			<div class="text-sm text-gray-600">
				Showing {data.users.meta.from} to {data.users.meta.to} of {data.users.meta.total} users
			</div>

			<div class="space-x-2 flex">
				{#if data.users.meta.links.prev}
					<button
						onclick={() => goToPage(data.users.meta.links.prev!)}
						class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
					>
						Previous
					</button>
				{/if}

				<span class="rounded bg-gray-100 px-3 py-1">
					Page {data.users.meta.current_page} of {data.users.meta.last_page}
				</span>

				{#if data.users.meta.links.next}
					{data.users.meta.links.next}
					<button
						onclick={() => goToPage(data.users.meta.links.next!)}
						class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
					>
						Next
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
