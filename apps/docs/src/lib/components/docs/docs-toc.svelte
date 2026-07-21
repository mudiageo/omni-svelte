<script lang="ts">
	import { onMount } from 'svelte';
	import { cn } from '$lib/utils.js';
	import { Separator } from '$lib/components/ui/separator';

	let headings: Array<{ id: string; text: string; level: number }> = $state([]);
	let activeId = $state('');

	onMount(() => {
		const article = document.querySelector('article');
		if (!article) return;
		const els = Array.from(article.querySelectorAll('h2, h3')) as HTMLElement[];
		headings = els.map(el => ({ id: el.id, text: el.textContent ?? '', level: parseInt(el.tagName[1]) }));

		const observer = new IntersectionObserver(
			entries => { entries.forEach(e => { if (e.isIntersecting) activeId = e.target.id; }); },
			{ rootMargin: '0% 0% -75% 0%', threshold: 0 }
		);
		els.forEach(el => observer.observe(el));
		return () => observer.disconnect();
	});
</script>

{#if headings.length > 0}
	<div class="hidden xl:block">
		<div class="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pb-10">
			<p class="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">On This Page</p>
			<ul class="space-y-1">
				{#each headings as h}
					<li>
						<a
							href="#{h.id}"
							class={cn(
								'block text-[13px] py-0.5 transition-colors leading-snug',
								h.level === 3 ? 'pl-3 text-[12px]' : '',
								activeId === h.id
									? 'text-primary font-medium'
									: 'text-muted-foreground hover:text-foreground'
							)}
						>
							{h.text}
						</a>
					</li>
				{/each}
			</ul>

			<Separator class="my-4" />
			<div class="space-y-1">
				<a href="https://github.com/mudiageo/omnisvelte" target="_blank" rel="noopener" class="block text-[12px] text-muted-foreground hover:text-foreground transition-colors py-0.5">
					GitHub Repository ↗
				</a>
				<a href="https://discord.gg/omnisvelte" target="_blank" rel="noopener" class="block text-[12px] text-muted-foreground hover:text-foreground transition-colors py-0.5">
					Discord Community ↗
				</a>
			</div>
		</div>
	</div>
{/if}
