<script>
  import { enhance } from '$app/forms'

  export let data
  export let form
</script>

<div class="container mx-auto p-6 max-w-2xl">
  <div class="flex items-center mb-6">
    <a href="/users" class="text-blue-600 hover:text-blue-800 mr-4">← Back to Users</a>
    <h1 class="text-3xl font-bold">Create User</h1>
  </div>

  {#if form?.errors?.general}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {form.errors.general}
    </div>
  {/if}

  <form method="POST" use:enhance class="bg-white shadow rounded-lg p-6">
    <div class="space-y-4">
      <div>
        <label for="name" class="block text-sm font-medium text-gray-700 mb-1">Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={form?.values?.name || ''}
          class="w-full border rounded px-3 py-2 {form?.errors?.name ? 'border-red-500' : 'border-gray-300'}"
          required
        />
        {#if form?.errors?.name}
          <p class="text-red-500 text-sm mt-1">{form.errors.name}</p>
        {/if}
      </div>

      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          id="email"
          name="email"
          value={form?.values?.email || ''}
          class="w-full border rounded px-3 py-2 {form?.errors?.email ? 'border-red-500' : 'border-gray-300'}"
          required
        />
        {#if form?.errors?.email}
          <p class="text-red-500 text-sm mt-1">{form.errors.email}</p>
        {/if}
      </div>

      <div>
        <label for="password" class="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          id="password"
          name="password"
          class="w-full border rounded px-3 py-2 {form?.errors?.password ? 'border-red-500' : 'border-gray-300'}"
          required
        />
        {#if form?.errors?.password}
          <p class="text-red-500 text-sm mt-1">{form.errors.password}</p>
        {/if}
      </div>

      <div>
        <label class="flex items-center">
          <input
            type="checkbox"
            name="active"
            checked={form?.values?.active !== false}
            class="mr-2"
          />
          <span class="text-sm font-medium text-gray-700">Active</span>
        </label>
      </div>
    </div>

    <div class="mt-6 flex space-x-3">
      <button
        type="submit"
        class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
      >
        Create User
      </button>
      <a
        href="/users"
        class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
      >
        Cancel
      </a>
    </div>
  </form>
</div>
