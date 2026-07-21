import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageLoad } from "./$types.js";
import { getDoc } from "$lib/docs.js";

export const load: PageLoad = async ({ params }) => {
	const slug = params.slug || 'getting-started/introduction';

	try {
		// Import all docs — velite generates this
		const { docs } = await import('$velite');
		const doc = docs.find((d) => d.slugAsParams === slug);

		if (!doc) {
			error(404, `Documentation page not found: ${slug}`);
		}
    const document  = await getDoc(params.slug);
	  const name = document.metadata.slug;
		
		return { doc, ...document};
	} catch (e) {
		error(404, 'Documentation page not found');
	}
};

export const prerender = true;

export const entries: EntryGenerator = () => {
	console.info("Prerendering /docs");
	const modules = import.meta.glob("../../../../content/docs/**/*.md");
	const entries = [];

	for (const path of Object.keys(modules)) {
		const slug = path.replace("/content/", "").replace(".md", "").replace("/index", "");
		entries.push({ slug });
	}

	return entries;
};