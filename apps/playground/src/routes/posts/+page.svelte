<script>
  import { enhance } from '$app/forms'
  import { goto, invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'

  export let data
  export let form

  let searchValue = data.search
  let statusValue = data.status

  function handleSearch(e) {
    e.preventDefault()
    const params = new URLSearchParams($page.url.searchParams)
    if (searchValue) {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }
    if (statusValue) {
      params.set('status', statusValue)
    } else {
      params.delete('status')
    }
    params.delete('page')
    goto(`?${params.toString()}`)
  }

  function goToPage(pageNum) {
    const params = new URLSearchParams($page.url.searchParams)
    params.set('page', pageNum.toString())
    goto(`?${params.toString()}`)
  }
</script>

<div class="container mx-auto p-6">
  <div class="flex justify-between items-center mb-6">
    <h1 class="text-3xl font-bold">Posts</h1>
    <a href="/posts/create" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
      Create Post
    </a>
  </div>

  {#if form?.error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {form.error}
    </div>
  {/if}

  {#if form?.success}
    <div class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {form.message}
    </div>
  {/if}

  <!-- Search and Filters -->
  <div class="mb-6 bg-white p-4 rounded-lg shadow">
    <form onsubmit={handleSearch} class="flex gap-4">
      <div class="flex-1">
        <input
          type="text"
          bind:value={searchValue}
          placeholder="Search posts by title or content..."
          class="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <select bind:value={statusValue} class="border rounded px-3 py-2">
          <option value="">All Posts</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </select>
      </div>
      <button type="submit" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
        Search
      </button>
    </form>
  </div>

  <!-- Posts Grid -->
  <div class="grid gap-6">
    {#each data.posts.data as post}
      <div class="bg-white shadow rounded-lg p-6">
        <div class="flex justify-between items-start mb-4">
          <div class="flex-1">
            <h2 class="text-xl font-semibold mb-2">
              <a href="/posts/{post.id}" class="text-blue-600 hover:text-blue-800">
                {post.title}
              </a>
            </h2>
            {#if post.content}
              <p class="text-gray-600 mb-3">
                {post.content.substring(0, 200)}...
              </p>
            {/if}
            <div class="flex items-center space-x-4 text-sm text-gray-500">
              {#if post.author}
                <span>By {post.author.name}</span>
              {/if}
              <span>{new Date(post.created_at).toLocaleDateString()}</span>
              <span class="px-2 py-1 text-xs rounded-full {post.published ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                {post.published ? 'Published' : 'Draft'}
              </span>
            </div>
          </div>
          
          <div class="flex space-x-2 ml-4">
            <a href="/posts/{post.id}/edit" class="text-blue-600 hover:text-blue-800 text-sm">
              Edit
            </a>
            
            <form method="POST" action="?/toggle_published" class="inline" use:enhance={() => {
              return async ({ result, update }) => {
                await update()
                await invalidateAll()
              }
            }}>
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" class="text-yellow-600 hover:text-yellow-800 text-sm">
                {post.published ? 'Unpublish' : 'Publish'}
              </button>
            </form>

            <form method="POST" action="?/delete" class="inline" use:enhance={() => {
              return async ({ result, update }) => {
                if (confirm('Are you sure you want to delete this post?')) {
                  await update()
                  await invalidateAll()
                }
              }
            }}>
              <input type="hidden" name="id" value={post.id} />
              <button type="submit" class="text-red-600 hover:text-red-800 text-sm">
                Delete
              </button>
            </form>
          </div>
        </div>
      </div>
    {/each}
  </div>

  {#if data.posts.data.length === 0}
    <div class="text-center py-12 text-gray-500">
      No posts found.
    </div>
  {/if}

  <!-- Pagination -->
  {#if data.posts.meta.last_page > 1}
    <div class="mt-8 flex justify-between items-center">
      <div class="text-sm text-gray-600">
        Showing {data.posts.meta.from} to {data.posts.meta.to} of {data.posts.meta.total} posts
      </div>
      
      <div class="flex space-x-2">
        {#if data.posts.meta.links.prev}
          <button 
            onclick={() => goToPage(data.posts.meta.links.prev)}
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Previous
          </button>
        {/if}
        
        <span class="px-3 py-1 bg-gray-100 rounded">
          Page {data.posts.meta.current_page} of {data.posts.meta.last_page}
        </span>
        
        {#if data.posts.meta.links.next}
          <button 
            onclick={() => goToPage(data.posts.meta.links.next)}
            class="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Next
          </button>
        {/if}
      </div>
    </div>
  {/if}
</div>
