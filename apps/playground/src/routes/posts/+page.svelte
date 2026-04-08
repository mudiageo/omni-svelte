<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';

	export let data;
	export let form;

	let searchValue = data.search;
	let statusValue = data.status;

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const params = new URLSearchParams($page.url.searchParams);
		if (searchValue) {
			params.set('search', searchValue);
		} else {
			params.delete('search');
		}
		if (statusValue) {
			params.set('status', statusValue);
		} else {
			params.delete('status');
		}
		params.delete('page');
		goto(`?${params.toString()}`);
	}

	function goToPage(pageNum: number) {
		const params = new URLSearchParams($page.url.searchParams);
		params.set('page', pageNum.toString());
		goto(`?${params.toString()}`);
	}
</script>

<div class="p-6 container mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Posts</h1>
		<a href="/posts/create" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
			Create Post
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

	<!-- Search and Filters -->
	<div class="mb-6 rounded-lg bg-white p-4 shadow">
		<form onsubmit={handleSearch} class="gap-4 flex">
			<div class="flex-1">
				<input
					type="text"
					bind:value={searchValue}
					placeholder="Search posts by title or content..."
					class="rounded px-3 py-2 w-full border"
				/>
			</div>
			<div>
				<select bind:value={statusValue} class="rounded px-3 py-2 border">
					<option value="">All Posts</option>
					<option value="published">Published</option>
					<option value="draft">Draft</option>
				</select>
			</div>
			<button type="submit" class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
				Search
			</button>
		</form>
	</div>

	<!-- Posts Grid -->
	<div class="gap-6 grid">
		{#each data.posts.data as post}
			<div class="rounded-lg bg-white p-6 shadow">
				<div class="mb-4 flex items-start justify-between">
					<div class="flex-1">
						<h2 class="mb-2 text-xl font-semibold">
							<a href="/posts/{post.id}" class="text-blue-600 hover:text-blue-800">
								{post.title}
							</a>
						</h2>
						{#if post.content}
							<p class="mb-3 text-gray-600">
								{post.content.substring(0, 200)}...
							</p>
						{/if}
						<div class="space-x-4 text-sm text-gray-500 flex items-center">
							{#if post.author}
								<span>By {post.author.name}</span>
							{/if}
							<span>{new Date(post.created_at).toLocaleDateString()}</span>
							<span
								class="px-2 py-1 text-xs rounded-full {post.published
									? 'bg-green-100 text-green-800'
									: 'bg-yellow-100 text-yellow-800'}"
							>
								{post.published ? 'Published' : 'Draft'}
							</span>
						</div>
					</div>

					<div class="ml-4 space-x-2 flex">
						<a href="/posts/{post.id}/edit" class="text-sm text-blue-600 hover:text-blue-800">
							Edit
						</a>

						<form
							method="POST"
							action="?/toggle_published"
							class="inline"
							use:enhance={() => {
								return async ({ result, update }) => {
									await update();
									await invalidateAll();
								};
							}}
						>
							<input type="hidden" name="id" value={post.id} />
							<button type="submit" class="text-sm text-yellow-600 hover:text-yellow-800">
								{post.published ? 'Unpublish' : 'Publish'}
							</button>
						</form>

						<form
							method="POST"
							action="?/delete"
							class="inline"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (confirm('Are you sure you want to delete this post?')) {
										await update();
										await invalidateAll();
									}
								};
							}}
						>
							<input type="hidden" name="id" value={post.id} />
							<button type="submit" class="text-sm text-red-600 hover:text-red-800">
								Delete
							</button>
						</form>
					</div>
				</div>
			</div>
		{/each}
	</div>

	{#if data.posts.data.length === 0}
		<div class="py-12 text-gray-500 text-center">No posts found.</div>
	{/if}

	<!-- Pagination -->
	{#if data.posts.meta.last_page > 1}
		<div class="mt-8 flex items-center justify-between">
			<div class="text-sm text-gray-600">
				Showing {data.posts.meta.from} to {data.posts.meta.to} of {data.posts.meta.total} posts
			</div>

			<div class="space-x-2 flex">
				{#if data.posts.meta.links.prev}
					<button
						onclick={() => goToPage(data.posts.meta.links.prev)}
						class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
					>
						Previous
					</button>
				{/if}

				<span class="rounded bg-gray-100 px-3 py-1">
					Page {data.posts.meta.current_page} of {data.posts.meta.last_page}
				</span>

				{#if data.posts.meta.links.next}
					<button
						onclick={() => goToPage(data.posts.meta.links.next)}
						class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
					>
						Next
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
