<script lang="ts">
	import { page } from '$app/state';
	import { siteConfig } from '#lib/config.js';

	interface BreadcrumbItem {
		name: string;
		item: string;
	}

	interface ArticleMeta {
		publishedTime?: string;
		modifiedTime?: string;
		author?: string;
		tags?: string[];
	}

	let {
		title,
		description,
		canonical,
		keywords = siteConfig.keywords,
		ogType = 'website',
		ogImage = siteConfig.ogImage,
		ogImageAlt,
		article,
		breadcrumbs,
		jsonLd,
		noindex = false
	}: {
		title?: string;
		description?: string;
		canonical?: string;
		keywords?: string[];
		ogType?: 'website' | 'article';
		ogImage?: string;
		ogImageAlt?: string;
		article?: ArticleMeta;
		breadcrumbs?: BreadcrumbItem[];
		jsonLd?: Record<string, any> | Array<Record<string, any>>;
		noindex?: boolean;
	} = $props();

	const pageTitle = $derived(
		title
			? title.includes(siteConfig.name)
				? title
				: `${title} — ${siteConfig.name}`
			: siteConfig.title
	);

	const metaDescription = $derived(description || siteConfig.description);

	const canonicalUrl = $derived(
		canonical || `${siteConfig.url}${page.url.pathname.replace(/\/$/, '') || '/'}`
	);

	const imageUrl = $derived(
		ogImage ? (ogImage.startsWith('http') ? ogImage : `${siteConfig.url}${ogImage}`) : undefined
	);

	const breadcrumbJsonLd = $derived(
		breadcrumbs && breadcrumbs.length > 0
			? {
					'@context': 'https://schema.org',
					'@type': 'BreadcrumbList',
					itemListElement: breadcrumbs.map((bc, idx) => ({
						'@type': 'ListItem',
						position: idx + 1,
						name: bc.name,
						item: bc.item.startsWith('http') ? bc.item : `${siteConfig.url}${bc.item}`
					}))
				}
			: null
	);

	const jsonLdScripts = $derived.by(() => {
		const items: Array<Record<string, any>> = [];
		if (jsonLd) {
			if (Array.isArray(jsonLd)) items.push(...jsonLd);
			else items.push(jsonLd);
		}
		if (breadcrumbJsonLd) {
			items.push(breadcrumbJsonLd);
		}
		return items.map(
			(data) => `<script type="application/ld+json">${JSON.stringify(data)}<\/script>`
		);
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<meta name="description" content={metaDescription} />
	<link rel="canonical" href={canonicalUrl} />

	{#if keywords && keywords.length > 0}
		<meta name="keywords" content={keywords.join(', ')} />
	{/if}

	<meta name="author" content={siteConfig.author} />

	{#if noindex}
		<meta name="robots" content="noindex, nofollow" />
	{:else}
		<meta
			name="robots"
			content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
		/>
	{/if}

	<!-- OpenGraph -->
	<meta property="og:site_name" content={siteConfig.name} />
	<meta property="og:type" content={ogType} />
	<meta property="og:title" content={pageTitle} />
	<meta property="og:description" content={metaDescription} />
	<meta property="og:url" content={canonicalUrl} />
	{#if imageUrl}
		<meta property="og:image" content={imageUrl} />
		<meta property="og:image:alt" content={ogImageAlt || pageTitle} />
		<meta property="og:image:width" content="1200" />
		<meta property="og:image:height" content="630" />
	{/if}
	<meta property="og:locale" content="en_US" />

	{#if ogType === 'article' && article}
		{#if article.publishedTime}
			<meta property="article:published_time" content={article.publishedTime} />
		{/if}
		{#if article.modifiedTime}
			<meta property="article:modified_time" content={article.modifiedTime} />
		{/if}
		{#if article.author}
			<meta property="article:author" content={article.author} />
		{/if}
		{#if article.tags}
			{#each article.tags as tag}
				<meta property="article:tag" content={tag} />
			{/each}
		{/if}
	{/if}

	<!-- Twitter Cards -->
	<meta name="twitter:card" content="summary_large_image" />
	{#if siteConfig.twitterHandle}
		<meta name="twitter:site" content={siteConfig.twitterHandle} />
		<meta name="twitter:creator" content={siteConfig.twitterHandle} />
	{/if}
	<meta name="twitter:title" content={pageTitle} />
	<meta name="twitter:description" content={metaDescription} />
	{#if imageUrl}
		<meta name="twitter:image" content={imageUrl} />
		<meta name="twitter:image:alt" content={ogImageAlt || pageTitle} />
	{/if}

	<!-- Structured Data (JSON-LD) -->
	{#each jsonLdScripts as scriptTag}
		<!-- eslint-disable-next-line svelte/no-at-html-tags -->
		{@html scriptTag}
	{/each}
</svelte:head>
