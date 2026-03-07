<script lang="ts">
	const logos = [
		{
			id: 'primary',
			label: 'Primary Logo',
			desc: 'Orange → Amber/Gold gradient · White swooshes · Standard use',
			src: '/logo.svg',
			bg: '#fff',
			tag: 'Light BG'
		},
		{
			id: 'primary-dark',
			label: 'Primary Logo (Dark BG)',
			desc: 'Orange → Amber/Gold gradient · On dark backgrounds',
			src: '/logo.svg',
			bg: '#0F0F1A',
			tag: 'Dark BG'
		},
		{
			id: 'dark',
			label: 'Dark / Premium Logo',
			desc: 'Crimson → Amber/Gold gradient · Warm-cream swooshes · Drop shadow · Premium contexts',
			src: '/logo-dark.svg',
			bg: '#0F0F1A',
			tag: 'Premium'
		},
		{
			id: 'dark-light',
			label: 'Dark Logo (Light BG)',
			desc: 'Crimson → Amber/Gold gradient on white',
			src: '/logo-dark.svg',
			bg: '#fff',
			tag: 'Light BG'
		}
	];

	const palette = [
		{ name: 'Brand Orange', hex: '#FF3E00', css: '--brand-orange' },
		{ name: 'Deep Crimson', hex: '#7C2105', css: '--brand-crimson' },
		{ name: 'Amber Mid', hex: '#E07B00', css: '--brand-amber-mid' },
		{ name: 'Amber / Gold', hex: '#F59E0B', css: '--brand-amber' },
		{ name: 'Gold Light', hex: '#FFD580', css: '--brand-gold-light' },
		{ name: 'Dark BG', hex: '#0F0F1A', css: '--bg-base' },
		{ name: 'Dark Raised', hex: '#16162A', css: '--bg-raised' },
		{ name: 'Text Primary', hex: '#F8F8FF', css: '--text-primary' },
		{ name: 'Text Muted', hex: '#A1A1C7', css: '--text-secondary' }
	];

	const fonts = [
		{
			role: 'Display / Headline',
			family: 'Inter',
			weight: '700 / 900',
			example: 'SvelteKit with superpowers.'
		},
		{
			role: 'Body',
			family: 'Inter',
			weight: '400 / 500',
			example: 'Transform your SvelteKit app into a production-ready powerhouse.'
		},
		{
			role: 'Monospace / Code',
			family: 'Geist Mono',
			weight: '400',
			example: 'omni-svelte/database'
		}
	];

	function contrast(hex: string) {
		const r = parseInt(hex.slice(1, 3), 16);
		const g = parseInt(hex.slice(3, 5), 16);
		const b = parseInt(hex.slice(5, 7), 16);
		return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#0F0F1A' : '#FFFFFF';
	}
</script>

<svelte:head>
	<title>Brand — omni-svelte</title>
</svelte:head>

<main class="brand-page">
	<header class="brand-header">
		<div class="header-logo">
			<img src="/logo.svg" alt="omni-svelte" width="48" height="58" />
			<span>omni-svelte</span>
		</div>
		<h1>Brand Identity</h1>
		<p class="subtitle">
			Design system, logos, colour palette, and usage guidelines for omni-svelte.
		</p>
	</header>

	<!-- LOGOS -->
	<section class="brand-section">
		<h2>Logomark</h2>
		<p class="section-desc">
			The omni-svelte logomark is based on the Svelte flame silhouette, recoloured in a premium
			orange → amber/gold gradient. Two variants are provided.
		</p>
		<div class="logo-grid">
			{#each logos as logo}
				<div class="logo-card">
					<div class="logo-preview" style="background:{logo.bg}">
						<img src={logo.src} alt={logo.label} width="100" height="121" />
					</div>
					<div class="logo-info">
						<span class="logo-tag">{logo.tag}</span>
						<strong>{logo.label}</strong>
						<p>{logo.desc}</p>
						<a href={logo.src} download class="dl-btn">↓ Download SVG</a>
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- FAVICON -->
	<section class="brand-section">
		<h2>Favicon</h2>
		<div class="favicon-row">
			{#each [64, 48, 32, 24, 16] as size}
				<div class="favicon-item">
					<div
						class="favicon-preview"
						style="background:#0F0F1A; padding:{size < 24 ? 8 : 12}px; border-radius:8px;"
					>
						<img src="/favicon.svg" alt="favicon" width={size} height={size * 1.23} />
					</div>
					<span>{size}px</span>
				</div>
			{/each}
		</div>
	</section>

	<!-- COLOUR PALETTE -->
	<section class="brand-section">
		<h2>Colour Palette</h2>
		<div class="palette-grid">
			{#each palette as swatch}
				<div class="swatch" style="background:{swatch.hex}; color:{contrast(swatch.hex)}">
					<strong>{swatch.name}</strong>
					<code>{swatch.hex}</code>
					<small>{swatch.css}</small>
				</div>
			{/each}
		</div>
	</section>

	<!-- GRADIENT -->
	<section class="brand-section">
		<h2>Brand Gradient</h2>
		<div class="gradient-bar" style="background: linear-gradient(90deg, #FF3E00, #E07B00, #F59E0B)">
			<span style="color:#fff">#FF3E00</span>
			<span style="color:#fff; opacity:0.7">→ #E07B00 →</span>
			<span style="color:#0F0F1A">#F59E0B</span>
		</div>
		<div
			class="gradient-bar"
			style="background: linear-gradient(90deg, #7C2105, #CC3600, #E07B00, #F59E0B)"
		>
			<span style="color:#FFD580">#7C2105</span>
			<span style="color:#FFD580; opacity:0.7">— premium dark variant —</span>
			<span style="color:#0F0F1A">#F59E0B</span>
		</div>
	</section>

	<!-- TYPOGRAPHY -->
	<section class="brand-section">
		<h2>Typography</h2>
		<div class="type-stack">
			{#each fonts as f}
				<div class="type-row">
					<div class="type-meta">
						<strong>{f.role}</strong>
						<span>{f.family} · {f.weight}</span>
					</div>
					<div
						class="type-sample"
						style="font-family:{f.family === 'Geist Mono'
							? 'monospace'
							: 'sans-serif'}; font-weight:{f.weight.split(' / ')[0]}"
					>
						{f.example}
					</div>
				</div>
			{/each}
		</div>
	</section>

	<!-- USAGE -->
	<section class="brand-section">
		<h2>Usage Guidelines</h2>
		<ul class="guidelines">
			<li>✅ Use <strong>logo.svg</strong> on light backgrounds and in docs/marketing</li>
			<li>✅ Use <strong>logo-dark.svg</strong> on dark backgrounds or in premium contexts</li>
			<li>✅ Maintain aspect ratio — never stretch or distort the flame</li>
			<li>✅ Minimum size: 24px height for the icon-only mark</li>
			<li>❌ Do not recolour the logo outside the brand palette</li>
			<li>❌ Do not add drop shadows beyond what's built into logo-dark.svg</li>
			<li>❌ Do not place the logo on clashing or low-contrast backgrounds</li>
		</ul>
	</section>
</main>

<style>
	.brand-page {
		min-height: 100vh;
		background: #0f0f1a;
		color: #f8f8ff;
		font-family: 'Inter', system-ui, sans-serif;
		padding: 2rem;
		max-width: 1100px;
		margin: 0 auto;
	}

	.brand-header {
		text-align: center;
		padding: 4rem 0 3rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		margin-bottom: 3rem;
	}

	.header-logo {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.header-logo span {
		font-size: 2rem;
		font-weight: 800;
		background: linear-gradient(90deg, #ff3e00, #f59e0b);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	h1 {
		font-size: 3rem;
		font-weight: 900;
		margin: 0 0 0.5rem;
	}
	h2 {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
	}
	.subtitle {
		color: #a1a1c7;
		font-size: 1.1rem;
		margin: 0;
	}
	.section-desc {
		color: #a1a1c7;
		margin: 0 0 1.5rem;
	}

	.brand-section {
		margin-bottom: 3.5rem;
		padding-bottom: 3rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}

	/* Logo grid */
	.logo-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	.logo-card {
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 16px;
		overflow: hidden;
		background: #16162a;
	}

	.logo-preview {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2.5rem;
		transition: background 0.2s;
	}

	.logo-info {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.logo-tag {
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #f59e0b;
	}

	.logo-info strong {
		font-size: 1rem;
		color: #fff;
	}
	.logo-info p {
		font-size: 0.82rem;
		color: #a1a1c7;
		margin: 0;
	}

	.dl-btn {
		margin-top: 0.5rem;
		display: inline-block;
		font-size: 0.8rem;
		color: #ff3e00;
		text-decoration: none;
		border: 1px solid rgba(255, 62, 0, 0.3);
		padding: 0.3rem 0.75rem;
		border-radius: 6px;
		width: fit-content;
		transition: background 0.15s;
	}
	.dl-btn:hover {
		background: rgba(255, 62, 0, 0.1);
	}

	/* Favicon */
	.favicon-row {
		display: flex;
		align-items: flex-end;
		gap: 1.5rem;
		flex-wrap: wrap;
		margin-top: 1.5rem;
	}
	.favicon-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}
	.favicon-item span {
		font-size: 0.75rem;
		color: #a1a1c7;
	}

	/* Palette */
	.palette-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
		margin-top: 1.5rem;
	}
	.swatch {
		border-radius: 12px;
		padding: 1.25rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.swatch strong {
		font-size: 0.85rem;
		font-weight: 600;
	}
	.swatch code {
		font-size: 0.75rem;
		opacity: 0.85;
		font-family: monospace;
	}
	.swatch small {
		font-size: 0.65rem;
		opacity: 0.6;
	}

	/* Gradient bars */
	.gradient-bar {
		border-radius: 12px;
		padding: 1.5rem 2rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: 700;
		font-size: 0.9rem;
		margin-top: 1rem;
	}

	/* Typography */
	.type-stack {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-top: 1.5rem;
	}
	.type-row {
		display: flex;
		gap: 2rem;
		align-items: flex-start;
		padding: 1.25rem;
		background: #16162a;
		border-radius: 12px;
	}
	.type-meta {
		min-width: 200px;
	}
	.type-meta strong {
		display: block;
		color: #fff;
		font-size: 0.9rem;
	}
	.type-meta span {
		color: #a1a1c7;
		font-size: 0.8rem;
	}
	.type-sample {
		font-size: 1.1rem;
		color: #f8f8ff;
		line-height: 1.5;
	}

	/* Guidelines */
	.guidelines {
		list-style: none;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-top: 1rem;
	}
	.guidelines li {
		padding: 0.75rem 1rem;
		border-radius: 8px;
		font-size: 0.9rem;
	}
	.guidelines li:has(✅) {
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.2);
	}
	.guidelines li:has(❌) {
		background: rgba(255, 62, 0, 0.08);
		border: 1px solid rgba(255, 62, 0, 0.15);
	}
</style>
