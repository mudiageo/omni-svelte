// @ts-check
import { defineConfig } from 'mdsx';
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import rehypeSlug from "rehype-slug";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";
import { visit } from "unist-util-visit";
// import { u } from "unist-builder";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const jsEngine = createJavaScriptRegexEngine();

export async function createHighlighter() {
	if (!globalThis.__shikiHighlighter) {
		globalThis.__shikiHighlighter = await createHighlighterCore({
			themes: [
				import("@shikijs/themes/github-dark"),
				import("@shikijs/themes/github-light-default"),
			],
			langs: [
				import("@shikijs/langs/typescript"),
				import("@shikijs/langs/svelte"),
				import("@shikijs/langs/css"),
				import("@shikijs/langs/json"),
				import("@shikijs/langs/bash"),
				import("@shikijs/langs/astro"),
				import("@shikijs/langs/diff"),
			],
			engine: jsEngine,
		});
	}
	return globalThis.__shikiHighlighter;
}

/**
 * @typedef {import('mdast').Root} MdastRoot
 * @typedef {import('hast').Root} HastRoot
 * @typedef {import('unified').Transformer<HastRoot, HastRoot>} HastTransformer
 * @typedef {import('unified').Transformer<MdastRoot, MdastRoot>} MdastTransformer
 */

/**
 * @type {import('rehype-pretty-code').Options}
 */
const prettyCodeOptions = {
	theme: {
		dark: "github-dark",
		light: "github-light-default",
	},
	keepBackground: false,
	// @ts-expect-error - shh
	getHighlighter: createHighlighter,
	onVisitLine(node) {
		// Prevent lines from collapsing in `display: grid` mode, and allow empty
		// lines to be copy/pasted
		if (node.children.length === 0) {
			node.children = [{ type: "text", value: " " }];
		}
	},
	onVisitHighlightedLine(node) {
		node.properties.className = ["line--highlighted"];
	},
	onVisitHighlightedChars(node) {
		node.properties.className = ["chars--highlighted"];
	},
};
 
export const mdsxConfig = defineConfig({
	extensions: ['.md'],
	remarkPlugins: [remarkGfm],
	rehypePlugins: [
		rehypeSlug,
		rehypePreData,
		[rehypePrettyCode, prettyCodeOptions],
	],
	blueprints: {
		default: {
			path: resolve(__dirname, "./src/lib/components/mdsx/blueprint.svelte"),
		},
	},
});

/**
 * add data to `pre`  element
 * @returns {HastTransformer} - Unified Transformer
 */
function rehypePreData() {
	return (tree) => {
		visit(tree, (node) => {
			if (node?.type === "element" && node?.tagName === "pre") {
				const [codeEl] = node.children;
				if (codeEl.type !== "element") return;
				if (codeEl.tagName !== "code") return;

				// Extract language and add data-language attribute 
				const classNames = codeEl.properties?.className || [];
				const languageClass = classNames.find((cls) => 
					typeof cls === "string" && cls.startsWith("language-")
				);
				
				if (languageClass) {
					const language = languageClass.replace("language-", "");
					// Ensure the properties object exists on the pre node
					node.properties = node.properties || {};
					// Attach the data attribute
					node.properties["data-language"] = language;
				}
			

				if (
					codeEl.data &&
					"meta" in codeEl.data &&
					codeEl.data.meta &&
					typeof codeEl.data.meta === "string"
				) {
					// Extract event from meta and pass it down the tree.
					const regex = /event="([^"]*)"/;
					const match = codeEl.data?.meta.match(regex);
					if (match) {
						// @ts-expect-error - this is fine
						node.__event__ = match ? match[1] : null;
						codeEl.data.meta = codeEl.data.meta.replace(regex, "");
					}
				}

				// @ts-expect-error - this is fine
				node.__rawString__ = codeEl.children?.[0].value;
				// @ts-expect-error - this is fine
				node.__src__ = node.properties?.__src__;
				// @ts-expect-error - this is fine
				node.__style__ = node.properties?.__style__;
			}
		});
	};
}
