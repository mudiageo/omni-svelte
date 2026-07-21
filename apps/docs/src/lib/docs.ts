import { docs as allDocs } from "$velite/index.js";
import { error } from "@sveltejs/kit";
import type { Component } from "svelte";

type DocMetadata = (typeof allDocs)[number];
type DocResolver = () => Promise<{ default: Component; metadata: DocMetadata }>;


export function transformPath(path: string): string {
	return path.replace("../../../../content/docs/", "").replace("../../../../content/blog/", "").replace(".md", "").replace("/index", "").trim();
}

function getDocMetadata(slug: string): DocMetadata | undefined {
	return allDocs.find((doc) => doc.slugAsParams === slug); 
}


export async function getDoc(
	_slug: string
): Promise<{ component: Component; metadata: DocMetadata }> {
	const modules = import.meta.glob("../../../../content/docs/**/*.md");
	const slug = _slug === "" ? "index" : _slug;
	let match: { path?: string; resolver?: DocResolver } = {};

	for (const [path, resolver] of Object.entries(modules)) {
		if (transformPath(path) === slug) {
			match = { path, resolver: resolver as unknown as DocResolver };
			break;
		}
	}

	const doc = await match?.resolver?.();
	const metadata = getDocMetadata(slug);

	if (!doc || !metadata) {
		error(404, "Could not find the documentation page.");
	}

	return {
		component: doc.default,
		metadata,
	};
}