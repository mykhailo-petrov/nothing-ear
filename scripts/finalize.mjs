import { existsSync, readdirSync, renameSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { cp } from 'node:fs/promises';
import { execSync } from 'node:child_process';
import path from 'node:path';

const projectRoot = process.cwd();
const minify = !process.argv.includes('--no-min');
const suffix = minify ? 'min' : 'no-min';
const baseName = path.basename(projectRoot).replace(/-(no-)?min$/, '');
const outputDir = path.resolve(projectRoot, '..', `${baseName}-${suffix}`);
const inPlace = outputDir === projectRoot;
const workDir = inPlace ? `${outputDir}.finalize-tmp` : outputDir;

const excludeDirs = new Set(['node_modules', 'dist', 'dist-ssr', '.git']);

const steps = [
	'node scripts/clean-unused.mjs --yes',
	'node scripts/strip-comments.mjs --yes',
	'node scripts/pin-versions.mjs',
	'npx prettier --write . --log-level warn',
	'npx stylelint "src/**/*.scss" --fix',
	'npx prettier --check .',
	'npx stylelint "src/**/*.scss"',
	minify ? 'npx vite build' : 'npx vite build --minify false',
];

if (existsSync(outputDir)) console.log(`Существующая копия перезаписывается: ${outputDir}`);
if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true });

await cp(projectRoot, workDir, {
	recursive: true,
	filter: (src) => {
		const [firstSegment] = path.relative(projectRoot, src).split(path.sep);
		return !excludeDirs.has(firstSegment);
	},
});
console.log(`Проект скопирован в: ${workDir}\n`);

const modulesLink = path.join(workDir, 'node_modules');
symlinkSync(path.join(projectRoot, 'node_modules'), modulesLink, 'dir');

try {
	for (const step of steps) {
		console.log(`\n▶ ${step}`);
		execSync(step, { cwd: workDir, stdio: 'inherit' });
	}
} catch {
	console.error(`\nОстановлено на ошибке. Копия оставлена для проверки: ${workDir}`);
	process.exitCode = 1;
} finally {
	unlinkSync(modulesLink);
}

if (!process.exitCode && inPlace) {
	for (const entry of readdirSync(outputDir)) {
		if (entry !== 'node_modules')
			rmSync(path.join(outputDir, entry), { recursive: true, force: true });
	}
	for (const entry of readdirSync(workDir)) {
		renameSync(path.join(workDir, entry), path.join(outputDir, entry));
	}
	rmSync(workDir, { recursive: true, force: true });
}

if (!process.exitCode) {
	console.log(`\nГотово. Проект для публикации: ${outputDir}`);
	console.log(
		`Сборка (${minify ? 'минифицированная' : 'читаемая'}): ${path.join(outputDir, 'dist')}`
	);
}
