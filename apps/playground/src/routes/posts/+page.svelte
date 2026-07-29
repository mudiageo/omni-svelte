<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { deletePost, updatePost, posts } from './data.remote';
	import { fromURL } from 'omni-svelte/remote';

	// Parse URL params for SSR and client reactivity
	let queryInput = $derived(fromURL(page.url));

	// Fetch data
	let postsQuery = $derived(posts(queryInput));

	let searchValue = $state('');
	let statusValue = $state('');

	// Initialize local state from URL once
	$effect(() => {
		if (queryInput.search && !searchValue) searchValue = queryInput.search;
		if (queryInput.filters?.published !== undefined && !statusValue) {
			statusValue = queryInput.filters.published ? 'true' : 'false';
		}
	});

	function handleSearch(e: SubmitEvent) {
		e.preventDefault();
		const url = new URL(page.url);
		if (searchValue) {
			url.searchParams.set('search', searchValue);
		} else {
			url.searchParams.delete('search');
		}
		if (statusValue) {
			url.searchParams.set('published', statusValue);
		} else {
			url.searchParams.delete('published');
		}
		url.searchParams.delete('page');
		goto(url.search);
	}

	function goToPage(pageNum: number) {
		const url = new URL(page.url);
		url.searchParams.set('page', pageNum.toString());
		goto(url.search);
	}
</script>

<div class="p-6 container mx-auto">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Posts</h1>
		<a href="/posts/create" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
			Create Post
		</a>
	</div>

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
					<option value="true">Published</option>
					<option value="false">Draft</option>
				</select>
			</div>
			<button type="submit" class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
				Search
			</button>
		</form>
	</div>

	<!-- Posts Grid -->
	{#await postsQuery}
		<div class="py-12 text-gray-500 text-center">Loading posts...</div>
	{:then data}
		<div class="gap-6 grid">
			{#each data.data as post}
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

							<form {...updatePost.for(`${post.id}-${Date.now()}`)} class="inline">
								<input {...updatePost.fields.id.as('hidden', post.id || '')} />
								<input {...updatePost.fields.published.as('hidden', !post.published ? 'true' : 'false')} />
								<button type="submit" class="text-sm text-yellow-600 hover:text-yellow-800">
									{post.published ? 'Unpublish' : 'Publish'}
								</button>
							</form>

							<button
								class="text-sm text-red-600 hover:text-red-800"
								onclick={async () => {
									if (confirm('Are you sure you want to delete this post?')) {
										await deletePost(post.id);
									}
								}}
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>

		{#if data.data.length === 0}
			<div class="py-12 text-gray-500 text-center">No posts found.</div>
		{/if}

		<!-- Pagination -->
		{#if data.meta.last_page > 1}
			<div class="mt-8 flex items-center justify-between">
				<div class="text-sm text-gray-600">
					Showing {data.meta.from} to {data.meta.to} of {data.meta.total} posts
				</div>

				<div class="space-x-2 flex">
					{#if data.meta.links.prev}
						<button
							onclick={() => goToPage(data.meta.links.prev!)}
							class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
						>
							Previous
						</button>
					{/if}

					<span class="rounded bg-gray-100 px-3 py-1">
						Page {data.meta.current_page} of {data.meta.last_page}
					</span>

					{#if data.meta.links.next}
						<button
							onclick={() => goToPage(data.meta.links.next!)}
							class="rounded bg-blue-500 px-3 py-1 text-white hover:bg-blue-600"
						>
							Next
						</button>
					{/if}
				</div>
			</div>
		{/if}
	{:catch err}
		<div class="py-12 text-red-500 text-center">Error loading posts: {err.message}</div>
	{/await}
</div>
