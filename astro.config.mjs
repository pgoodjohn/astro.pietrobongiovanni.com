// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
// import tailwind from '@astrojs/tailwind';

// https://astro.build/config
export default defineConfig({
	site: 'https://pietrobongiovanni.com',
	integrations: [mdx(), sitemap(),],

	vite: {
		plugins: [tailwindcss()],
	},
});