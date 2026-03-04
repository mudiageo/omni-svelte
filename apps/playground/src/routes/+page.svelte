<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/state'
  
  export let data
    function goToPage(pageNum: number) {
    const params = new URLSearchParams(page.url.searchParams)
    params.set('page', pageNum.toString())
    goto(`?${params.toString()}`)
  }

</script>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">OmniSvelte Database Test</h1>
  
  {#if data.error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      <strong>Error:</strong> {data.error}
    </div>
  {/if}
  <a href="/users"> Users </a>
  <a href="/posts"> POsts </a>
  
  <!-- Database Statistics -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
    <div class="bg-blue-100 p-4 rounded-lg">
      <h3 class="font-semibold text-blue-800">Total Users</h3>
      <p class="text-2xl font-bold text-blue-600">{data.stats.totalUsers}</p>
    </div>
    <div class="bg-green-100 p-4 rounded-lg">
      <h3 class="font-semibold text-green-800">Total Posts</h3>
      <p class="text-2xl font-bold text-green-600">{data.stats.totalPosts}</p>
    </div>
    <div class="bg-purple-100 p-4 rounded-lg">
      <h3 class="font-semibold text-purple-800">Published Posts</h3>
      <p class="text-2xl font-bold text-purple-600">{data.stats.publishedPosts}</p>
    </div>
  </div>
  
  <!-- Recent Users -->
  <div class="mb-8">
    <h2 class="text-2xl font-semibold mb-4">Recent Active Users</h2>
    {#if data.recentUsers.length > 0}
      <div class="bg-white shadow rounded-lg overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each data.recentUsers as user}
              <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.name}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(user.created_at).toLocaleDateString()}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {:else}
      <p class="text-gray-500">No users found.</p>
    {/if}
  </div>
  
  <!-- Published Posts -->
  <div class="mb-8">
    <h2 class="text-2xl font-semibold mb-4">Latest Published Posts</h2>
    {#if data.publishedPosts.length > 0}
      <div class="space-y-4">
        {#each data.publishedPosts as post}
          <div class="bg-white shadow rounded-lg p-6">
            <h3 class="text-lg font-semibold mb-2">{post.title}</h3>
            {#if post.content}
              <p class="text-gray-600 mb-3">{post.content.substring(0, 150)}...</p>
            {/if}
            {#if post.author}
              <p class="text-sm text-gray-500">
                By {post.author.name} • {new Date(post.created_at).toLocaleDateString()}
              </p>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-gray-500">No published posts found.</p>
    {/if}
  </div>
  
  
  <!-- Test Information -->
  <div class="mt-8 p-4 bg-gray-100 rounded-lg">
    <h3 class="font-semibold mb-2">ORM Features Tested:</h3>
    <ul class="text-sm text-gray-600 space-y-1">
      <li>✅ Model registration and locals.query access</li>
      <li>✅ Basic queries with where clauses</li>
      <li>✅ Relationship loading (with)</li>
      <li>✅ Ordering and limiting</li>
      <li>✅ Aggregation functions</li>
      <li>✅ Pagination with metadata</li>
      <li>✅ Attribute casting and JSON serialization</li>
      <li>✅ Hidden attributes (password excluded)</li>
    </ul>
  </div>
</div>

<style>
  /* Add basic styling if Tailwind isn't available */
  .container { max-width: 1200px; }
  .grid { display: grid; }
  .grid-cols-1 { grid-template-columns: repeat(1, 1fr); }
  .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
  .gap-4 { gap: 1rem; }
  .mb-4 { margin-bottom: 1rem; }
  .mb-6 { margin-bottom: 1.5rem; }
  .mb-8 { margin-bottom: 2rem; }
  .p-4 { padding: 1rem; }
  .p-6 { padding: 1.5rem; }
  .rounded-lg { border-radius: 0.5rem; }
  .shadow { box-shadow: 0 1px 3px rgba(0,0,0,0.12); }
</style>
