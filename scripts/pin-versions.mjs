import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const sections = ['dependencies', 'devDependencies'];
const floating = new Set(['latest', '*', '']);

function readJson(file) {
	return JSON.parse(readFileSync(path.join(projectRoot, file), 'utf8'));
}

function writeJson(file, data) {
	writeFileSync(path.join(projectRoot, file), `${JSON.stringify(data, null, '\t')}\n`);
}

const pkg = readJson('package.json');
const pinned = {};
const missing = [];

for (const section of sections) {
	for (const [name, range] of Object.entries(pkg[section] ?? {})) {
		if (!floating.has(range.trim())) continue;

		const installed = path.join(projectRoot, 'node_modules', name, 'package.json');
		if (!existsSync(installed)) {
			missing.push(name);
			continue;
		}

		const { version } = JSON.parse(readFileSync(installed, 'utf8'));
		pkg[section][name] = `^${version}`;
		pinned[name] = { section, version: `^${version}` };
	}
}

if (missing.length) {
	console.warn(`Не установлены (сначала npm i): ${missing.join(', ')}`);
}

if (!Object.keys(pinned).length) {
	console.log('Плавающих версий нет — всё уже закреплено.');
	process.exit(missing.length ? 1 : 0);
}

writeJson('package.json', pkg);

if (existsSync(path.join(projectRoot, 'package-lock.json'))) {
	const lock = readJson('package-lock.json');
	const root = lock.packages?.[''];
	if (root) {
		for (const [name, { section, version }] of Object.entries(pinned)) {
			if (root[section]?.[name]) root[section][name] = version;
		}
		writeJson('package-lock.json', lock);
	}
}

console.log('Закреплены версии:');
for (const [name, { version }] of Object.entries(pinned)) console.log(`  ${name}: ${version}`);
