<script>
	import { enhance } from '$app/forms';

	export const data = undefined;
	export let form;
</script>

<div class="max-w-2xl p-6 container mx-auto">
	<div class="mb-6 flex items-center">
		<a href="/users" class="mr-4 text-blue-600 hover:text-blue-800">← Back to Users</a>
		<h1 class="text-3xl font-bold">Create User</h1>
	</div>

	{#if form?.errors?.general}
		<div class="mb-4 rounded border-red-400 bg-red-100 px-4 py-3 text-red-700 border">
			{form.errors.general}
		</div>
	{/if}

	<form method="POST" use:enhance class="rounded-lg bg-white p-6 shadow">
		<div class="space-y-4">
			<div>
				<label for="name" class="mb-1 text-sm font-medium text-gray-700 block">Name</label>
				<input
					type="text"
					id="name"
					name="name"
					value={form?.values?.name || ''}
					class="rounded px-3 py-2 w-full border {form?.errors?.name
						? 'border-red-500'
						: 'border-gray-300'}"
					required
				/>
				{#if form?.errors?.name}
					<p class="mt-1 text-sm text-red-500">{form.errors.name}</p>
				{/if}
			</div>

			<div>
				<label for="email" class="mb-1 text-sm font-medium text-gray-700 block">Email</label>
				<input
					type="email"
					id="email"
					name="email"
					value={form?.values?.email || ''}
					class="rounded px-3 py-2 w-full border {form?.errors?.email
						? 'border-red-500'
						: 'border-gray-300'}"
					required
				/>
				{#if form?.errors?.email}
					<p class="mt-1 text-sm text-red-500">{form.errors.email}</p>
				{/if}
			</div>

			<div>
				<label for="password" class="mb-1 text-sm font-medium text-gray-700 block">Password</label>
				<input
					type="password"
					id="password"
					name="password"
					class="rounded px-3 py-2 w-full border {form?.errors?.password
						? 'border-red-500'
						: 'border-gray-300'}"
					required
				/>
				{#if form?.errors?.password}
					<p class="mt-1 text-sm text-red-500">{form.errors.password}</p>
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

		<div class="mt-6 space-x-3 flex">
			<button type="submit" class="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
				Create User
			</button>
			<a href="/users" class="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-600">
				Cancel
			</a>
		</div>
	</form>
</div>
