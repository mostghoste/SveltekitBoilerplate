import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// adapter-vercel directly, not adapter-auto: adapter-auto 3 installs adapter-vercel 4 at build
		// time, which refuses to build on anything but Node 18/20, and Vercel has retired Node 20.
		adapter: adapter()
	},
	preprocess: vitePreprocess()
};

export default config;
