<script>
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';

	export let data;
	export let form;

	let searchValue = data.search;

	function handleSearch(e) {
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

	function goToPage(pageNum) {
		const params = new URLSearchParams(page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<div class="container mx-auto p-6">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Users</h1>
		<a href="/users/create" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
			Create User
		</a>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="mb-4 rounded border border-green-400 bg-green-100 px-4 py-3 text-green-700">
			{form.message}
		</div>
	{/if}

	<!-- Search -->
	<div class="mb-6">
		<form onsubmit={handleSearch} class="flex gap-2">
			<input
				type="text"
				bind:value={searchValue}
				placeholder="Search users by name or email..."
				class="flex-1 rounded border px-3 py-2"
			/>
			<button type="submit" class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
				Search
			</button>
		</form>
	</div>

	<!-- Users Table -->
	<div class="overflow-hidden rounded-lg bg-white shadow">
		<table class="min-w-full">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Created</th>
					<th class="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-200">
				{#each data.users.data as user}
					<tr>
						<td class="whitespace-nowrap px-6 py-4">
							<a href="/users/{user.id}" class="font-medium text-blue-600 hover:text-blue-800">
								{user.name}
							</a>
						</td>
						<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
							{user.email}
						</td>
						<td class="whitespace-nowrap px-6 py-4">
							<span
								class="rounded-full px-2 py-1 text-xs {user.active
									? 'bg-green-100 text-green-800'
									: 'bg-red-100 text-red-800'}"
							>
								{user.active ? 'Active' : 'Inactive'}
							</span>
						</td>
						<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
							{new Date(user.created_at).toLocaleDateString()}
						</td>
						<td class="space-x-2 whitespace-nowrap px-6 py-4 text-sm">
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
			<div class="py-8 text-center text-gray-500">No users found.</div>
		{/if}
	</div>

	<!-- Pagination -->
	{#if data.users.meta.last_page > 1}
		<div class="mt-6 flex items-center justify-between">
			<div class="text-sm text-gray-600">
				Showing {data.users.meta.from} to {data.users.meta.to} of {data.users.meta.total} users
			</div>

			<div class="flex space-x-2">
				{#if data.users.meta.links.prev}
					<button
						onclick={() => goToPage(data.users.meta.links.prev)}
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
						onclick={() => goToPage(data.users.meta.links.next)}
						class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
					>
						Next
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
