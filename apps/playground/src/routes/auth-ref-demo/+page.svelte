<script lang="ts">
	import {
		getContext,
		profiles,
		createProfile,
		notes,
		createNote,
		deleteNote,
		posts,
		createPost
	} from './data.remote';

	import { authClient } from '$auth/client';

	const session = authClient.useSession();
	const ctx = getContext();

	let mode = $state<'signin' | 'signup'>('signin');
	let name = $state('');
	let email = $state('');
	let password = $state('');
	let authError = $state('');
	let authBusy = $state(false);

	async function submitAuth(e: SubmitEvent) {
		e.preventDefault();
		authError = '';
		authBusy = true;
		const { error } =
			mode === 'signup'
				? await authClient.signUp.email({ email, password, name })
				: await authClient.signIn.email({ email, password });
		authBusy = false;
		if (error) authError = error.message ?? 'Authentication failed';
		else {
			password = '';
			await ctx.refresh();
		}
	}

	async function signOut() {
		await authClient.signOut();
		log = [];
	}
	const userId = $derived(ctx.current?.userId);

	const profileQuery = $derived(userId ? profiles({ filters: { userId } }) : null);
	const notesQuery = $derived(userId ? notes({ filters: { ownerId: userId } }) : null);
	const postsQuery = $derived(userId ? posts({ filters: { ownerId: userId } }) : null);

	const profile = $derived(profileQuery?.current?.data?.[0]);

	let noteBody = $state('');
	let postTitle = $state('');
	let postContent = $state('');
	let log = $state<{ label: string; ok: boolean; detail: unknown }[]>([]);

	async function run<T>(label: string, fn: () => Promise<T>, refresh: (() => unknown)[] = []) {
		try {
			const detail = await fn();
			log = [{ label, ok: true, detail }, ...log].slice(0, 8);
			await Promise.all(refresh.map((r) => r()));
		} catch (e) {
			log = [{ label, ok: false, detail: (e as Error).message ?? e }, ...log].slice(0, 8);
		}
	}

	const fmt = (v: unknown) => JSON.stringify(v, null, 2);
	const kind = (v: unknown) => `${typeof v}`;
</script>

<svelte:head><title>Auth reference playground</title></svelte:head>

<main class="mx-auto max-w-5xl space-y-8 p-6">
	<header>
		<h1 class="text-2xl font-bold">Auth reference playground</h1>
		<p class="text-sm text-muted-foreground">
			Live reads and writes through <code>noteSchema</code>, <code>profileSchema</code> and
			<code>postSchema</code>, exercising <code>auth.user</code> and <code>'session'</code> references.
		</p>
	</header>

	{#if !$session.data}
		<section class="mx-auto max-w-sm space-y-4 rounded-lg border p-4">
			<div class="flex gap-2 text-sm">
				<button class="rounded px-3 py-1 {mode === 'signin' ? 'bg-primary text-primary-foreground' : 'border'}" onclick={() => (mode = 'signin')}>Sign in</button>
				<button class="rounded px-3 py-1 {mode === 'signup' ? 'bg-primary text-primary-foreground' : 'border'}" onclick={() => (mode = 'signup')}>Sign up</button>
			</div>
			<form class="space-y-3" onsubmit={submitAuth}>
				{#if mode === 'signup'}
					<input class="w-full rounded border px-2 py-1 text-sm" placeholder="Name" required bind:value={name} />
				{/if}
				<input class="w-full rounded border px-2 py-1 text-sm" type="email" placeholder="Email" required bind:value={email} />
				<input class="w-full rounded border px-2 py-1 text-sm" type="password" placeholder="Password" required bind:value={password} />
				{#if authError}<p class="text-sm text-red-600">{authError}</p>{/if}
				<button class="w-full rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground" disabled={authBusy}>
					{authBusy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
				</button>
			</form>
		</section>
	{:else}
		<div class="flex items-center justify-between text-sm">
			<span>Signed in as <strong>{$session.data.user.email}</strong></span>
			<button class="underline" onclick={signOut}>Sign out</button>
		</div>

	<!-- Session / profile -->
	<section class="space-y-3 rounded-lg border p-4">
		<h2 class="font-semibold">Session and profile</h2>
		{#if ctx.error}
			<p class="text-sm text-red-600">{ctx.error.message}</p>
		{:else if ctx.current}
			<dl class="grid gap-1 font-mono text-xs md:grid-cols-2">
				<dt>auth user.id ({kind(ctx.current.userId)})</dt><dd>{ctx.current.userId}</dd>
				<dt>auth session.id ({kind(ctx.current.sessionId)})</dt><dd>{ctx.current.sessionId}</dd>
				<dt>profile.id ({kind(profile?.id)})</dt><dd>{profile?.id ?? 'none'}</dd>
				<dt>profile.userId ({kind(profile?.userId)})</dt><dd>{profile?.userId ?? 'none'}</dd>
			</dl>
			{#if !profile}
				<button
					class="rounded bg-primary px-3 py-1.5 text-sm text-primary-foreground"
					onclick={() => run('createProfile', () => createProfile({ userId: ctx.current!.userId }), [() => profileQuery?.refresh()])}
				>
					Create profile
				</button>
			{/if}
		{:else}
			<p class="text-sm">Loading…</p>
		{/if}
	</section>

	<div class="grid gap-6 md:grid-cols-2">
		<!-- Notes -->
		<section class="space-y-3 rounded-lg border p-4">
			<h2 class="font-semibold">Notes <span class="text-xs font-normal">(ownerId → auth.user, sessionId → 'session')</span></h2>
			<div class="flex gap-2">
				<input class="flex-1 rounded border px-2 py-1 text-sm" placeholder="Note body" bind:value={noteBody} />
				<button
					class="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
					disabled={!noteBody}
					onclick={() =>
						run('createNote', () => createNote({ body: noteBody, ownerId: ctx.current!.userId, sessionId: ctx.current!.sessionId }), [() => notesQuery?.refresh()]).then(() => (noteBody = ''))}
				>
					Add
				</button>
			</div>
			<ul class="space-y-2">
				{#each notesQuery?.current?.data ?? [] as n (n.id)}
					<li class="rounded border p-2 text-sm">
						<div class="flex justify-between">
							<span>{n.body}</span>
							<button class="text-xs text-red-600" onclick={() => run('deleteNote', () => deleteNote(n.id), [() => notesQuery?.refresh()])}>delete</button>
						</div>
						<div class="mt-1 font-mono text-[11px] text-muted-foreground">
							id:{kind(n.id)} · ownerId:{kind(n.ownerId)} · sessionId:{kind(n.sessionId)}
						</div>
					</li>
				{:else}
					<li class="text-sm text-muted-foreground">No notes yet.</li>
				{/each}
			</ul>
			<button
				class="text-xs underline"
				onclick={() => run('FK violation test', () => createNote({ body: 'orphan note', ownerId: 'does-not-exist', sessionId: ctx.current!.sessionId }), [() => notesQuery?.refresh()])}
			>
				Insert note with a non-existent owner (expect FK rejection)
			</button>
		</section>

		<!-- Posts -->
		<section class="space-y-3 rounded-lg border p-4">
			<h2 class="font-semibold">Posts <span class="text-xs font-normal">(userId → profiles int, ownerId → auth.user text)</span></h2>
			<input class="w-full rounded border px-2 py-1 text-sm" placeholder="Title" bind:value={postTitle} />
			<textarea class="w-full rounded border px-2 py-1 text-sm" placeholder="Content" bind:value={postContent}></textarea>
			<button
				class="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
				disabled={!postTitle || !postContent || !profile}
				onclick={() =>
					run('createPost', () => createPost({ title: postTitle, content: postContent, published: false, userId: profile!.id, ownerId: ctx.current!.userId }), [() => postsQuery?.refresh()]).then(() => {
						postTitle = '';
						postContent = '';
					})}
			>
				Add post
			</button>
			<ul class="space-y-2">
				{#each postsQuery?.current?.data ?? [] as p (p.id)}
					<li class="rounded border p-2 text-sm">
						<div>{p.title}</div>
						<div class="mt-1 font-mono text-[11px] text-muted-foreground">
							userId:{kind(p.userId)} ({p.userId}) · ownerId:{kind(p.ownerId)} ({p.ownerId})
						</div>
					</li>
				{:else}
					<li class="text-sm text-muted-foreground">No posts yet.</li>
				{/each}
			</ul>
		</section>
	</div>

	<!-- Result log -->
	<section class="space-y-2 rounded-lg border p-4">
		<h2 class="font-semibold">Result log</h2>
		{#each log as entry}
			<details class="text-sm" open={entry === log[0]}>
				<summary class={entry.ok ? 'text-emerald-700' : 'text-red-600'}>{entry.ok ? '✓' : '✗'} {entry.label}</summary>
				<pre class="overflow-x-auto rounded bg-muted p-2 text-xs">{fmt(entry.detail)}</pre>
			</details>
		{:else}
			<p class="text-sm text-muted-foreground">Run an action to see results.</p>
		{/each}
	</section>
	{/if}
</main>