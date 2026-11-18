<script lang="ts">
	import { page } from '$app/state';
	import { cn } from '#lib/utils.js';
	import { Separator } from '#lib/components/ui/separator/index.js';

	let headings: Array<{ id: string; text: string; level: number }> = $state([]);
	let activeId = $state('');

	$effect(() => {
		// Track pathname so TOC updates on page navigation
		const _path = page.url.pathname;
		const article = document.querySelector('article');
		if (!article) return;
		const els = Array.from(article.querySelectorAll('h2, h3')) as HTMLElement[];
		headings = els.map((el) => ({
			id: el.id,
			text: el.textContent ?? '',
			level: parseInt(el.tagName[1])
		}));

		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((e) => {
					if (e.isIntersecting) activeId = e.target.id;
				});
			},
			{ rootMargin: '0% 0% -75% 0%', threshold: 0 }
		);
		els.forEach((el) => observer.observe(el));
		return () => observer.disconnect();
	});
</script>

{#if headings.length > 0}
	<div class="hidden xl:block">
		<div class="sticky top-20 h-[calc(100vh-5rem)] overflow-y-auto pb-10">
			<p class="text-muted-foreground/60 mb-3 text-xs font-semibold tracking-widest uppercase">
				On This Page
			</p>
			<ul class="space-y-1">
				{#each headings as h}
					<li>
						<a
							href="#{h.id}"
							class={cn(
								'block py-0.5 text-[13px] leading-snug transition-colors',
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
				<a
					href="https://github.com/mudiageo/omnisvelte"
					target="_blank"
					rel="noopener"
					class="text-muted-foreground hover:text-foreground block py-0.5 text-[12px] transition-colors"
				>
					GitHub Repository ↗
				</a>
				<a
					href="https://discord.gg/omnisvelte"
					target="_blank"
					rel="noopener"
					class="text-muted-foreground hover:text-foreground block py-0.5 text-[12px] transition-colors"
				>
					Discord Community ↗
				</a>
			</div>
		</div>
	</div>
{/if}
