import { readFileSync, writeFileSync, existsSync, statSync, rmSync, readdirSync } from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import fastGlob from 'fast-glob';
import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import discardComments from 'postcss-discard-comments';
import strip from 'strip-comments';

const projectRoot = process.cwd();
const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry');
const skipConfirm = args.has('--yes');

const entry = 'index.html';

const aliases = [
	['@scss', 'src/scss/_index.scss'],
	['@scss/', 'src/scss/'],
	['@js/', 'src/js/'],
	['@assets/', 'src/assets/'],
	['@img/', 'src/assets/images/'],
	['@/', 'src/'],
];

const codeExts = new Set(['.js', '.mjs', '.scss', '.css']);
const fontExts = new Set(['.woff', '.woff2', '.ttf', '.otf', '.eot']);

const candidates = fastGlob
	.sync(['src/**/*', 'public/**/*', '*.html'], { cwd: projectRoot, dot: false })
	.map(toKey);

const scssProcessor = postcss([discardComments({ removeAll: true })]);

function toKey(file) {
	return path.relative(projectRoot, path.resolve(projectRoot, file)).split(path.sep).join('/');
}

const editedFiles = new Map();
const removedFiles = new Set();

function isFile(key) {
	if (removedFiles.has(key)) return false;
	const full = path.join(projectRoot, key);
	return existsSync(full) && statSync(full).isFile();
}

function readSource(key) {
	return editedFiles.get(key) ?? readFileSync(path.join(projectRoot, key), 'utf8');
}

function escapeRegExp(value) {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mentions(text, name) {
	return new RegExp(`(?<![\\w-])${escapeRegExp(name)}(?![\\w-])`).test(text);
}

function stripComments(key, source) {
	const ext = path.extname(key);
	if (ext === '.js' || ext === '.mjs') return strip(source, { line: true, block: true });
	if (ext === '.scss' || ext === '.css') {
		return scssProcessor.process(source, { syntax: postcssScss, from: undefined }).css;
	}
	if (ext === '.html' || ext === '.svg') return source.replace(/<!--[\s\S]*?-->/g, '');
	return source;
}

function resolveBase(spec, fromKey) {
	for (const [alias, target] of aliases) {
		if (alias.endsWith('/') ? spec.startsWith(alias) : spec === alias) {
			return toKey(target + spec.slice(alias.length));
		}
	}
	if (spec.startsWith('/')) return toKey(spec.slice(1));
	if (spec.startsWith('.')) return toKey(path.join(path.dirname(fromKey), spec));
	return null;
}

function resolveJs(spec, fromKey) {
	const base = resolveBase(spec, fromKey);
	if (!base) return [];
	const found = [base, `${base}.js`, `${base}.mjs`, `${base}/index.js`].find(isFile);
	return found ? [found] : [];
}

function resolveScss(spec, fromKey) {
	if (spec.startsWith('sass:') || /^(https?:)?\/\//.test(spec)) return [];
	const base = resolveBase(spec, fromKey) ?? toKey(path.join(path.dirname(fromKey), spec));
	const dir = path.posix.dirname(base);
	const name = path.posix.basename(base);
	const variants = [
		base,
		`${base}.scss`,
		`${dir}/_${name}.scss`,
		`${base}.css`,
		`${base}/_index.scss`,
		`${base}/index.scss`,
	];
	const found = variants.find(isFile);
	return found ? [found] : [];
}

function jsRefs(text, fromKey) {
	const refs = [];
	const patterns = [
		/\b(?:import|export)\s[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]/g,
		/\bimport\s*['"]([^'"]+)['"]/g,
		/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
		/new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g,
	];
	for (const pattern of patterns) {
		for (const [, spec] of text.matchAll(pattern)) refs.push(...resolveJs(spec, fromKey));
	}
	return refs;
}

function scssRefs(text, fromKey) {
	const refs = [];
	for (const [, list] of text.matchAll(
		/@(?:use|forward|import)\s+((?:['"][^'"]+['"]\s*,?\s*)+)/g
	)) {
		for (const [, spec] of list.matchAll(/['"]([^'"]+)['"]/g)) {
			refs.push(...resolveScss(spec, fromKey));
		}
	}
	return refs;
}

function htmlRefs(text, fromKey) {
	const refs = [];
	for (const [, attr, value] of text.matchAll(/\b(src|href|srcset)\s*=\s*"([^"]*)"/g)) {
		const urls =
			attr === 'srcset' ? value.split(',').map((part) => part.trim().split(/\s+/)[0]) : [value];
		for (const url of urls) {
			if (!url || /^(#|[a-z]+:|\/\/)/i.test(url)) continue;
			const clean = url.split(/[?#]/)[0];
			const base = resolveBase(clean.startsWith('./') ? clean.slice(1) : clean, fromKey);
			const relative = toKey(path.join(path.dirname(fromKey), clean));
			refs.push(...[base, relative].filter((key) => key && isFile(key)));
		}
	}
	refs.push(...jsRefs(text, fromKey));
	return refs;
}

function findUsed() {
	const used = new Set();
	const queue = [entry];
	let corpus = '';

	const visit = (key) => {
		if (used.has(key) || !isFile(key)) return;
		used.add(key);
		queue.push(key);
	};

	while (queue.length) {
		while (queue.length) {
			const key = queue.shift();
			used.add(key);
			const ext = path.extname(key);
			if (!['.html', '.svg', ...codeExts].includes(ext)) continue;

			const text = stripComments(key, readSource(key));
			corpus += `\n${text}`;

			if (ext === '.html') htmlRefs(text, key).forEach(visit);
			if (ext === '.js' || ext === '.mjs') jsRefs(text, key).forEach(visit);
			if (ext === '.scss' || ext === '.css') {
				scssRefs(text, key).forEach(visit);
			}
		}

		for (const key of candidates) {
			if (used.has(key) || codeExts.has(path.extname(key))) continue;
			const name = path.posix.basename(key);
			const stem = name.slice(0, -path.extname(name).length);
			const isFont = fontExts.has(path.extname(key));
			if (mentions(corpus, name) || (isFont && mentions(corpus, stem))) visit(key);
		}
	}

	return used;
}

function removeEmptyDirs(dir) {
	if (!existsSync(dir)) return;
	for (const item of readdirSync(dir, { withFileTypes: true })) {
		if (item.isDirectory()) removeEmptyDirs(path.join(dir, item.name));
	}
	if (dir !== projectRoot && readdirSync(dir).length === 0) rmSync(dir, { recursive: true });
}

function removePagesFromViteConfig(pages) {
	const configPath = path.join(projectRoot, 'vite.config.js');
	if (!pages.length || !existsSync(configPath)) return;
	const source = readFileSync(configPath, 'utf8');
	const lines = source.split('\n');
	const kept = lines.filter((line) => !pages.some((page) => mentions(line, page)));
	if (kept.length === lines.length) return;
	writeFileSync(configPath, kept.join('\n'));
	console.log(`vite.config.js: из input убраны ${pages.join(', ')}`);
}

const containerAtRules = new Set(['media', 'supports', 'container', 'layer']);
const importAtRules = new Set(['use', 'forward', 'import']);

function markupCorpus(used) {
	return [...used]
		.filter((key) => ['.html', '.js', '.mjs'].includes(path.extname(key)))
		.map((key) => stripComments(key, readSource(key)))
		.join('\n');
}

function scssCorpus(used, skipKey) {
	return [...used]
		.filter((key) => path.extname(key) === '.scss' && key !== skipKey)
		.map((key) => stripComments(key, readSource(key)))
		.join('\n');
}

function analyzeStyles(key, markup) {
	const source = stripComments(key, readSource(key));
	const result = { keep: false, hasRules: false, alive: false, placeholders: [] };

	const selectorAlive = (selector) => {
		const classes = [...selector.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]);
		const attrs = [
			...selector.matchAll(/\[\s*([\w-]+)\s*(?:[~|^$*]?=\s*(['"]?)(.*?)\2)?\s*\]/g),
		].map((m) => ({ name: m[1], value: m[3] }));

		if (!classes.length && !attrs.length) return null;
		return (
			classes.some((name) => mentions(markup, name)) ||
			attrs.some(({ name, value }) => (value ? markup.includes(value) : mentions(markup, name)))
		);
	};

	const walk = (nodes) => {
		for (const node of nodes) {
			if (node.type === 'decl') result.keep = true;
			if (node.type === 'atrule') {
				if (importAtRules.has(node.name)) continue;
				if (containerAtRules.has(node.name)) walk(node.nodes ?? []);
				else result.keep = true;
			}
			if (node.type !== 'rule') continue;

			result.hasRules = true;
			for (const selector of node.selectors) {
				if (selector.startsWith('%')) {
					result.placeholders.push(selector.slice(1).trim());
					continue;
				}
				const alive = selector.includes('#{') ? null : selectorAlive(selector);
				if (alive === null) result.keep = true;
				if (alive) result.alive = true;
			}
		}
	};

	walk(postcssScss.parse(source).nodes);
	return result;
}

function removeImportsOf(deadKey, used) {
	const importers = [];
	for (const key of used) {
		if (path.extname(key) !== '.scss') continue;
		const source = readSource(key);
		const pattern = /^[ \t]*@(?:use|forward|import)\s+['"]([^'"]+)['"][^;]*;[ \t]*\r?\n?/gm;
		const next = source.replace(pattern, (line, spec) =>
			resolveScss(spec, key)[0] === deadKey ? '' : line
		);
		if (next !== source) importers.push([key, next]);
	}
	return importers;
}

function pruneDeadStyles(used, changes) {
	const markup = markupCorpus(used);
	let changed = false;

	for (const key of used) {
		if (path.extname(key) !== '.scss' || removedFiles.has(key)) continue;

		const info = analyzeStyles(key, markup);
		if (info.keep || !info.hasRules || info.alive) continue;

		const otherScss = scssCorpus(used, key);
		const extended = info.placeholders.some((name) =>
			new RegExp(`@extend\\s+%${escapeRegExp(name)}(?![\\w-])`).test(otherScss)
		);
		if (extended) continue;

		for (const [importer, next] of removeImportsOf(key, used)) {
			editedFiles.set(importer, next);
			changes.push(`${importer}: убран @use ${key}`);
		}
		removedFiles.add(key);
		changed = true;
	}

	return changed;
}

function pruneDeadFonts(used, changes) {
	const includePattern =
		/^[ \t]*@include\s+font\(\s*['"]?([^'",\s)]+)['"]?\s*,[^;]*\);[ \t]*\r?\n?/gm;
	const usageText = scssCorpus(used)
		.replace(includePattern, '')
		.replace(/^[ \t]*@(?:use|forward|import)\b[^;]*;/gm, '');
	let changed = false;

	for (const key of used) {
		if (path.extname(key) !== '.scss') continue;
		const source = readSource(key);
		const next = source.replace(includePattern, (line, family) => {
			if (mentions(usageText, family)) return line;
			changes.push(`${key}: убран @include font('${family}')`);
			return '';
		});
		if (next !== source) {
			editedFiles.set(key, next);
			changed = true;
		}
	}

	return changed;
}

if (!isFile(entry)) {
	console.error(`Не найден ${entry} — нечего анализировать.`);
	process.exit(1);
}

const changes = [];
let used = findUsed();
while (pruneDeadStyles(used, changes) || pruneDeadFonts(used, changes)) used = findUsed();

const unused = candidates.filter((key) => !used.has(key)).sort();

if (!unused.length && !editedFiles.size) {
	console.log('Неиспользуемых файлов нет.');
	process.exit(0);
}

if (unused.length) {
	console.log(`Не используются (${unused.length}):`);
	unused.forEach((key) => console.log(`  ${key}`));
}

if (changes.length) {
	console.log(`\nПравки в подключениях (${changes.length}):`);
	changes.forEach((change) => console.log(`  ${change}`));
}

if (dryRun) process.exit(0);

if (!skipConfirm) {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question('\nУдалить эти файлы? Отменить будет нельзя. (y/N) ');
	rl.close();
	if (answer.trim().toLowerCase() !== 'y') {
		console.log('Отменено, ничего не удалено.');
		process.exit(0);
	}
}

editedFiles.forEach((source, key) => {
	if (!removedFiles.has(key)) writeFileSync(path.join(projectRoot, key), source);
});
unused.forEach((key) => rmSync(path.join(projectRoot, key)));
removeEmptyDirs(path.join(projectRoot, 'src'));
removeEmptyDirs(path.join(projectRoot, 'public'));
removePagesFromViteConfig(unused.filter((key) => !key.includes('/') && key.endsWith('.html')));

console.log(`\nУдалено файлов: ${unused.length}.`);
