import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

// Dynamically import markdown files from root content/docs/
// Files live at {monorepo-root}/content/docs/{slug}.md
export const load: PageLoad = async ({ params }) => {
    const { slug } = params;

    try {
        // mdsvex compiles .md files — SvelteKit can import them as modules
        // const post = await import(`../../../../../../content/docs/${slug}.md`);
        const post = await import(`../../../../../../content/docs/${slug}.md`);
        return {
            content: post.default,
            meta: post.metadata ?? {}
        };
    } catch (e) {
        console.log(e)
        error(404, `Doc page not found: ${slug}`);
    }
};
