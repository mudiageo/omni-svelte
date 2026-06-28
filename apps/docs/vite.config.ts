import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
export const veliteDirPath = path.join(__dirname, ".velite");
export const contentDirPath = path.join(__dirname, "../../content");
// export const ogDirPath = path.join(__dirname, "src/routes/og");

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		fs: {
			allow: [veliteDirPath, contentDirPath],
		},
	},
});