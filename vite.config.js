import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import injectHTML from 'vite-plugin-html-inject';

const alias = {
	'@': fileURLToPath(new URL('./src', import.meta.url)),
	'@js': fileURLToPath(new URL('./src/js', import.meta.url)),
	'@scss': fileURLToPath(new URL('./src/scss', import.meta.url)),
	'@assets': fileURLToPath(new URL('./src/assets', import.meta.url)),
	'@img': fileURLToPath(new URL('./src/assets/images', import.meta.url)),
};

const htmlImgAlias = {
	name: 'html-img-alias',
	transformIndexHtml: {
		order: 'pre',
		handler: (html) => html.replaceAll('@img/', '/src/assets/images/'),
	},
};

export default defineConfig({
	base: './',
	plugins: [injectHTML(), htmlImgAlias],

	resolve: {
		alias,
	},
	css: {
		devSourcemap: true,
	},
	server: {
		open: true,
		host: true,
	},
	build: {
		sourcemap: true,
		rollupOptions: {
			input: {
				main: fileURLToPath(new URL('./index.html', import.meta.url)),
			},
		},
	},
});
