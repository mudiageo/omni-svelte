<script lang="ts">
	import { page } from '$app/state';
	import * as Sidebar from '#lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '#lib/components/ui/breadcrumb/index.js';
	import { Separator } from '#lib/components/ui/separator/index.js';
	import DocsSidebar from '#lib/components/docs/docs-sidebar.svelte';
	import { docsNav } from '#lib/docs-nav.js';

	let { children } = $props();

	function getSectionHref(segment: string) {
		const section = docsNav.find((s) =>
			s.items.some((item) => item.href?.startsWith(`/docs/${segment}`))
		);
		return section?.items[0]?.href;
	}
</script>

<Sidebar.Provider
	class="flex min-h-svh w-full flex-1"
	style="--sidebar-width: calc(var(--spacing) * 72)"
>
	<DocsSidebar />

	<Sidebar.Inset>
		<!-- Top header bar inside inset -->
		<header class="border-border/50 flex h-14 shrink-0 items-center gap-2 border-b px-4">
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
							{:else if getSectionHref(segment)}
								<Breadcrumb.Link href={getSectionHref(segment)} class="capitalize">
									{segment.replace(/-/g, ' ')}
								</Breadcrumb.Link>
							{:else}
								<span class="text-muted-foreground capitalize">{segment.replace(/-/g, ' ')}</span>
							{/if}
						</Breadcrumb.Item>
					{/each}
				</Breadcrumb.List>
			</Breadcrumb.Root>
		</header>

		<!-- Content area -->
		<div class="mx-auto flex w-full max-w-5xl flex-1 flex-col p-6 md:p-8 lg:p-10">
			{@render children()}
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>
