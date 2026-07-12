import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			// Force a supported runtime for local builds; Vercel will use its environment
			runtime: 'nodejs20.x'
		})
	}
};

export default config;
