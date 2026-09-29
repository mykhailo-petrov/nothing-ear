import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline/promises';
import fastGlob from 'fast-glob';
import postcssScss from 'postcss-scss';
import { parseSync } from 'rolldown/utils';

const projectRoot = process.cwd();
const skipConfirm = process.argv.includes('--yes');

const patterns = [
	'src/**/*.{js,mjs,cjs}',
	'src/**/*.scss',
	'src/**/*.html',
	'*.html',
	'*.{js,mjs,cjs}',
	'scripts/**/*.{js,mjs,cjs}',
	'jsconfig.json',
	'.vscode/*.json',
];

function stripJs(source, file = 'inline.js') {
	const { comments, errors } = parseSync(file, source);
	if (errors.length) {
		console.warn(`Не удалось разобрать ${file} — комментарии не тронуты`);
		return source;
	}

	let result = source;
	for (const { start, end } of [...comments].reverse()) {
		const lineStart = result.lastIndexOf('\n', start - 1) + 1;
		const lineEnd = result.indexOf('\n', end);
		const before = result.slice(lineStart, start);
		const after = result.slice(end, lineEnd === -1 ? result.length : lineEnd);

		if (!before.trim() && !after.trim()) {
			result =
				result.slice(0, lineStart) + result.slice(lineEnd === -1 ? result.length : lineEnd + 1);
		} else {
			result = result.slice(0, start).replace(/[ \t]+$/, '') + result.slice(end);
		}
	}
	return result;
}

function stripJson(source, file) {
	return stripJs(`(\n${source}\n)`, `${file}.js`).slice(2, -2);
}

function stripScss(source) {
	const root = postcssScss.parse(source);
	root.walkComments((comment) => comment.remove());
	return root.toString(postcssScss.stringify);
}

function stripHtml(source) {
	let result = source;

	result = result.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open, css, close) => {
		return open + stripScss(css) + close;
	});
	result = result.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_m, open, js, close) => {
		if (!js.trim()) return open + js + close;
		return open + stripJs(js) + close;
	});

	return result.replace(/<!--[\s\S]*?-->\s*\n?/g, '');
}

function stripFile(file, source) {
	if (file.endsWith('.scss')) return stripScss(source);
	if (file.endsWith('.html')) return stripHtml(source);
	if (file.endsWith('.json')) return stripJson(source, file);
	return stripJs(source, file);
}

const files = await fastGlob(patterns, { cwd: projectRoot, dot: false });
const changed = [];

for (const file of files.sort()) {
	const original = readFileSync(path.join(projectRoot, file), 'utf8');
	const result = stripFile(file, original);
	if (result !== original) changed.push({ file, result });
}

if (!changed.length) {
	console.log('Комментариев не найдено.');
	process.exit(0);
}

console.log(`Есть комментарии (${changed.length}):`);
changed.forEach(({ file }) => console.log(`  ${file}`));

if (!skipConfirm) {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(
		'\nУдалить комментарии в этих файлах? Отменить будет нельзя. (y/N) '
	);
	rl.close();
	if (answer.trim().toLowerCase() !== 'y') {
		console.log('Отменено, ничего не изменено.');
		process.exit(0);
	}
}

for (const { file, result } of changed) {
	writeFileSync(path.join(projectRoot, file), result, 'utf8');
}

execFileSync('npx', ['prettier', '--write', ...changed.map(({ file }) => file)], {
	cwd: projectRoot,
	stdio: 'ignore',
});

console.log(`\nГотово. Очищено файлов: ${changed.length}.`);
