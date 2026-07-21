<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import DocsSidebar from '$lib/components/docs/docs-sidebar.svelte';

	let { children } = $props();
</script>

<div class="container-wrapper flex flex-1 flex-col px-2">
	<!-- prettier-ignore -->
	<Sidebar.Provider
		class="min-h-min flex-1 items-start px-0 [--top-spacing:0] lg:grid lg:grid-cols-[var(--sidebar-width)_minmax(0,1fr)] lg:[--top-spacing:calc(var(--spacing)*4)] 3xl:fixed:container 3xl:fixed:px-3"
		style="--sidebar-width: calc(var(--spacing) * 72)"
	>
	<DocsSidebar />

	<Sidebar.Inset>
		<!-- Top header bar inside inset -->
		<header class="flex h-14 shrink-0 items-center gap-2 border-b border-border/50 px-4">
			<Sidebar.Trigger class="-ml-1" />
			<Separator orientation="vertical" class="h-4" />
			<!-- Breadcrumb built from current path -->
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item class="hidden md:block">
						<Breadcrumb.Link href="/docs">Docs</Breadcrumb.Link>
					</Breadcrumb.Item>
					{#each page.url.pathname.split('/').filter(Boolean).slice(1) as segment, i}
						<Breadcrumb.Separator class="hidden md:block" />
						<Breadcrumb.Item>
							{#if i === page.url.pathname.split('/').filter(Boolean).slice(1).length - 1}
								<Breadcrumb.Page class="capitalize">{segment.replace(/-/g, ' ')}</Breadcrumb.Page>
							{:else}
								<Breadcrumb.Link href="/{page.url.pathname.split('/').filter(Boolean).slice(0, i + 2).join('/')}" class="capitalize">
									{segment.replace(/-/g, ' ')}
								</Breadcrumb.Link>
							{/if}
						</Breadcrumb.Item>
					{/each}
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</header>

		<!-- Content area -->
		<div class="flex flex-1 flex-col gap-4 p-6 md:p-8 lg:p-10 xl:grid xl:grid-cols-[1fr_220px] xl:gap-10 max-w-5xl mx-auto w-full">
			<div class="min-w-0">
				{@render children()}
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
</div>