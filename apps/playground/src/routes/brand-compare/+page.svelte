<script lang="ts">
  const variants = [
    {
      id: '1', name: 'Rich Gold',
      desc: 'Dark goldenrod → gold → cornsilk. Luxurious, premium, high-end. The most golden option.',
      src: '/brand/v1-rich-gold.svg',
      style: 'Filled gradient',
      colors: ['#B8860B', '#FFD700', '#FFF8DC'],
      accent: '#FFD700'
    },
    {
      id: '2', name: 'Neon Outlined',
      desc: 'Stroke-only flame with green → cyan neon glow. Futuristic, techy, dark-mode-first. Radically different.',
      src: '/brand/v2-neon-outlined.svg',
      style: 'Outlined + glow filter',
      colors: ['#00FF88', '#00CCFF', '#0F0F1A'],
      accent: '#00FF88',
      darkOnly: true
    },
    {
      id: '3', name: 'Duotone Violet',
      desc: 'Violet body with lilac/lavender swoosh instead of white — creates a full duotone effect. Modern and playful.',
      src: '/brand/v3-duotone-violet.svg',
      style: 'Duotone (coloured swoosh)',
      colors: ['#7C3AED', '#C084FC', '#E9D5FF'],
      accent: '#C084FC'
    },
    {
      id: '4', name: 'Monochrome Silver',
      desc: 'Flat silver body, white swoosh. Clean, no-nonsense, works in print and monochrome contexts.',
      src: '/brand/v4-mono-silver.svg',
      style: 'Flat solid',
      colors: ['#E8E8E8', '#FFFFFF', '#888888'],
      accent: '#E8E8E8'
    },
    {
      id: '5', name: 'Emerald',
      desc: 'Deep emerald → mint green. Fresh, nature-inspired, trustworthy. Bottom-to-top gradient direction.',
      src: '/brand/v5-emerald.svg',
      style: 'Reversed gradient direction',
      colors: ['#047857', '#10B981', '#6EE7B7'],
      accent: '#10B981'
    },
    {
      id: '6', name: 'Sunset Blaze',
      desc: 'Hot pink → orange → gold with fiery outer glow. Bold, eye-catching, unapologetically loud.',
      src: '/brand/v6-sunset-blaze.svg',
      style: 'Gradient + drop shadow glow',
      colors: ['#FF0080', '#FF4D00', '#FFD700'],
      accent: '#FF4D00'
    },
    {
      id: '7', name: 'Ocean Blue',
      desc: 'Deep blue → sky → ice. Calm, professional, trustworthy. Classic tech palette.',
      src: '/brand/v7-ocean.svg',
      style: 'Filled gradient',
      colors: ['#0369A1', '#38BDF8', '#BAE6FD'],
      accent: '#38BDF8'
    },
    {
      id: '8', name: 'Midnight Chrome',
      desc: 'Dark slate body → silver with cool grey swoosh gradient (not white). Enterprise chrome feel, minimal.',
      src: '/brand/v8-midnight-chrome.svg',
      style: 'Duotone (grey swoosh)',
      colors: ['#1E293B', '#475569', '#94A3B8'],
      accent: '#94A3B8'
    },
    {
      id: 'A', name: 'Golden (original)',
      desc: 'Goldenrod → gold. The earlier golden variant for comparison.',
      src: '/brand/variant-a-golden.svg',
      style: 'Filled gradient',
      colors: ['#DAA520', '#FFD700', '#FFC125'],
      accent: '#FFD700'
    },
    {
      id: 'B', name: 'Amber (current)',
      desc: 'Orange → amber → dark gold. Current logo, closest to original Svelte orange.',
      src: '/brand/variant-b-amber.svg',
      style: 'Filled gradient',
      colors: ['#FF6B00', '#F59E0B', '#D4A017'],
      accent: '#F59E0B'
    },
    {
      id: 'C', name: 'Rose Gold',
      desc: 'Coral → warm orange → peach. Playful, consumer-facing, warm.',
      src: '/brand/variant-c-rosegold.svg',
      style: 'Filled gradient',
      colors: ['#E8444A', '#F07040', '#FFB74D'],
      accent: '#F07040'
    },
    {
      id: 'D', name: 'Ember',
      desc: 'Dark rust → burnt orange → old gold. Deep, serious, premium.',
      src: '/brand/variant-d-ember.svg',
      style: 'Filled gradient',
      colors: ['#B7410E', '#D4660E', '#E8A317'],
      accent: '#D4660E'
    }
  ];

  function contrast(hex: string) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 128 ? '#111' : '#fff';
  }
</script>

<svelte:head>
  <title>Brand Comparison — omni-svelte</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
</svelte:head>

<main>
  <header>
    <h1>Brand Explorer</h1>
    <p class="sub">12 variants of the omni-svelte logo — different colours, techniques, and moods.<br/>Pick a favourite or combine ideas.</p>
  </header>

  <div class="grid">
    {#each variants as v}
      <article class="card">
        <!-- Preview strip -->
        <div class="preview-strip">
          <div class="preview dark-bg">
            <img src={v.src} alt={v.name} width="64" height="77"/>
          </div>
          <div class="preview light-bg">
            <img src={v.src} alt={v.name} width="64" height="77"/>
          </div>
        </div>

        <!-- Info -->
        <div class="info">
          <div class="name-row">
            <span class="variant-id">{v.id}</span>
            <h2>{v.name}</h2>
          </div>
          <span class="style-tag">{v.style}</span>
          <p class="desc">{v.desc}</p>

          <!-- Swatches -->
          <div class="swatch-row">
            {#each v.colors as c}
              <div class="swatch" style="background:{c}" title={c}>
                <span style="color:{contrast(c)}">{c}</span>
              </div>
            {/each}
          </div>

          <!-- Wordmark mock -->
          <div class="wordmark-mock">
            <img src={v.src} alt="" width="24" height="29"/>
            <span class="wm-text" style="background:linear-gradient(90deg, {v.colors[0]}, {v.colors[v.colors.length-1]}); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">omni-svelte</span>
          </div>

          <!-- Gradient bar -->
          <div class="grad-bar" style="background:linear-gradient(90deg, {v.colors.join(', ')})"></div>

          <!-- Mini hero mock -->
          <div class="mini-hero">
            <div class="hero-badge" style="color:{v.accent}; border-color:{v.accent}40">SvelteKit with superpowers</div>
            <button style="background:linear-gradient(135deg, {v.colors[0]}, {v.colors[v.colors.length-1]}); color:{contrast(v.colors[1] || v.colors[0])}">Get Started</button>
          </div>
        </div>

        <a href={v.src} download class="dl">↓ SVG</a>
      </article>
    {/each}
  </div>
</main>

<style>
  :global(body) { margin: 0; }

  main {
    background: #08081A;
    color: #F8F8FF;
    font-family: 'Inter', system-ui, sans-serif;
    min-height: 100vh;
    padding: 2rem 1.5rem 4rem;
  }

  header { text-align: center; padding: 2rem 0 2.5rem; }
  h1 { font-size: 2.5rem; font-weight: 900; margin: 0; }
  .sub { color: #A1A1C7; margin: 0.5rem 0 0; line-height: 1.5; }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
    gap: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .card {
    background: #11112B;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    display: flex;
    flex-direction: column;
  }

  /* Preview */
  .preview-strip { display: flex; height: 140px; }
  .preview {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .dark-bg { background: #0F0F1A; }
  .light-bg { background: #FAFAFA; }

  /* Info area */
  .info { padding: 1.25rem 1.5rem; flex: 1; display: flex; flex-direction: column; gap: 0.6rem; }
  .name-row { display: flex; align-items: center; gap: 0.6rem; }
  .variant-id {
    background: rgba(255,255,255,0.08);
    color: #888;
    font-size: 0.65rem;
    font-weight: 700;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }
  h2 { font-size: 1.15rem; font-weight: 700; margin: 0; }
  .style-tag {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #6B6B8A;
  }
  .desc { font-size: 0.82rem; color: #A1A1C7; margin: 0; line-height: 1.45; }

  /* Swatches */
  .swatch-row { display: flex; gap: 0.4rem; }
  .swatch {
    flex: 1;
    padding: 0.5rem 0.4rem;
    border-radius: 6px;
    text-align: center;
  }
  .swatch span { font-size: 0.55rem; font-family: monospace; font-weight: 600; }

  /* Wordmark */
  .wordmark-mock {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: rgba(255,255,255,0.03);
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.05);
  }
  .wm-text { font-size: 1.1rem; font-weight: 800; }

  /* Gradient bar */
  .grad-bar { height: 6px; border-radius: 3px; }

  /* Mini hero */
  .mini-hero {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.6rem 0;
  }
  .hero-badge {
    font-size: 0.6rem;
    font-weight: 600;
    padding: 0.2rem 0.6rem;
    border: 1px solid;
    border-radius: 99px;
    white-space: nowrap;
  }
  .mini-hero button {
    padding: 0.4rem 1rem;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 0.72rem;
    cursor: pointer;
    font-family: inherit;
  }

  /* Download */
  .dl {
    display: block;
    text-align: center;
    padding: 0.6rem;
    font-size: 0.7rem;
    font-weight: 600;
    color: #6B6B8A;
    text-decoration: none;
    border-top: 1px solid rgba(255,255,255,0.04);
    transition: color 0.15s;
  }
  .dl:hover { color: #F8F8FF; }
</style>
