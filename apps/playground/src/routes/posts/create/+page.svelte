<script lang="ts">
	import { createPost, getUsers } from './data.remote';

	const users = getUsers();
</script>

<div class="p-6 container mx-auto max-w-2xl">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="text-3xl font-bold">Create Post</h1>
		<a href="/posts" class="text-blue-600 hover:text-blue-800">
			&larr; Back to Posts
		</a>
	</div>

	{#if createPost.result?.error}
		<div class="mb-4 rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
			{createPost.result.error}
		</div>
	{/if}

	<div class="rounded-lg bg-white p-6 shadow">
		<form {...createPost} class="space-y-6">
			<!-- Title -->
			<div>
				<label for="title" class="mb-1 block text-sm font-medium text-gray-700">Title</label>
				{#each createPost.fields.title.issues() ?? [] as issue}
					<p class="text-sm text-red-600">{issue.message}</p>
				{/each}
				<input
					{...createPost.fields.title.as('text')}
					class="w-full rounded border px-3 py-2 {createPost.fields.title.issues() ? 'border-red-500' : ''}"
					placeholder="Post title"
				/>
			</div>

			<!-- Content -->
			<div>
				<label for="content" class="mb-1 block text-sm font-medium text-gray-700">Content</label>
				{#each createPost.fields.content.issues() ?? [] as issue}
					<p class="text-sm text-red-600">{issue.message}</p>
				{/each}
				<textarea
					{...createPost.fields.content.as('text')}
					rows="6"
					class="w-full rounded border px-3 py-2 {createPost.fields.content.issues() ? 'border-red-500' : ''}"
					placeholder="Write your post content here..."
				></textarea>
			</div>

			<!-- Author (User ID) -->
			<div>
				<label for="user_id" class="mb-1 block text-sm font-medium text-gray-700">Author</label>
				{#each createPost.fields.user_id.issues() ?? [] as issue}
					<p class="text-sm text-red-600">{issue.message}</p>
				{/each}
				<select
					{...createPost.fields.user_id.as('select')}
					class="w-full rounded border px-3 py-2 {createPost.fields.user_id.issues() ? 'border-red-500' : ''}"
				>
					<option value="">Select an author...</option>
					{#each await users as user}
						<option value={user.id}>{user.name}</option>
					{/each}
				</select>
			</div>

			<!-- Published Status -->
			<div class="flex items-center">
				<input
					{...createPost.fields.published.as('checkbox')}
					class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
				/>
				<label for="published" class="ml-2 block text-sm text-gray-900">
					Publish immediately
				</label>
			</div>

			<div class="flex justify-end pt-4">
				<button
					type="submit"
					class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					Create Post
				</button>
			</div>
		</form>
	</div>
</div>
