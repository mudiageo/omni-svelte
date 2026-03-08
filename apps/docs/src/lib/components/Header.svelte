<script lang="ts">
	import Menu from '@lucide/svelte/icons/menu';
	import X from '@lucide/svelte/icons/x';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';

	let { sidebarOpen = $bindable() }: { sidebarOpen: boolean } = $props();

	function toggleDark() {
		document.documentElement.classList.toggle('dark');
	}
</script>

<header
	class="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80"
>
	<!-- Mobile sidebar toggle -->
	<button
		class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800"
		onclick={() => (sidebarOpen = !sidebarOpen)}
		aria-label="Toggle sidebar"
	>
		{#if sidebarOpen}
			<X class="h-5 w-5" />
		{:else}
			<Menu class="h-5 w-5" />
		{/if}
	</button>

	<!-- Logo -->
	<a href="/" class="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
		<span
			class="from-brand-500 flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br to-indigo-600 text-xs font-black text-white shadow-md"
		>
			O
		</span>
		<span>omni<span class="text-brand-600">-svelte</span></span>
	</a>

	<div class="ml-auto flex items-center gap-2">
		<a
			href="https://github.com/mudiageo/omni-svelte"
			target="_blank"
			rel="noopener"
			class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
			aria-label="GitHub"
		>
			<svg class="h-5 w-5 fill-current" viewBox="0 0 24 24">
				<path
					d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58v-2.03c-3.34.73-4.03-1.61-4.03-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"
				/>
			</svg>
		</a>

		<button
			class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
			onclick={toggleDark}
			aria-label="Toggle dark mode"
		>
			<Moon class="h-5 w-5 dark:hidden" />
			<Sun class="hidden h-5 w-5 dark:block" />
		</button>
	</div>
</header>
