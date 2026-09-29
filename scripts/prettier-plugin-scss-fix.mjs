import { parsers } from 'prettier/plugins/postcss';

const declarationRe = /^(\$[\w-]+|--[\w-]+|[a-z-]+)\s*:(\s*\S|$)/i;
const statementAtRuleRe = /^@(include|use|forward|import|extend|return|debug|warn|error|content)\b/;
const continuedEndRe = /[;{},(:[]$|[+\-*/]$/;
const continuationStartRe = /^[){,'"\]]/;

const slashProps = /^(\s*(?:grid-area|grid-row|grid-column|aspect-ratio)\s*:\s*)([^;{}]*)/i;

function splitComment(line) {
	const match = line.match(/^(.*?)(\s+\/\/.*)$/);
	return match && !match[1].trimEnd().endsWith(':') ? [match[1], match[2]] : [line, ''];
}

function countParens(code) {
	const withoutStrings = code.replace(/'[^']*'|"[^"]*"/g, '');
	return (withoutStrings.match(/\(/g) || []).length - (withoutStrings.match(/\)/g) || []).length;
}

function fixScss(text) {
	const lines = text.split('\n');
	let inBlockComment = false;
	let parenDepth = 0;
	let inValue = false;

	let declIndent = 0;

	const codeOf = (line) => splitComment(line)[0].trim();
	const indentOf = (line) => line.match(/^\s*/)[0].length;

	const nextIndex = (from) => {
		for (let i = from + 1; i < lines.length; i++) {
			const code = codeOf(lines[i]);
			if (code && !code.startsWith('//') && !code.startsWith('/*')) return i;
		}
		return -1;
	};
	const nextCode = (from) => {
		const i = nextIndex(from);
		return i === -1 ? '' : codeOf(lines[i]);
	};

	const continuesValue = (from) => {
		const i = nextIndex(from);
		if (i === -1) return false;
		const code = codeOf(lines[i]);
		return (
			indentOf(lines[i]) > declIndent &&
			!declarationRe.test(code) &&
			!/^[@}&]/.test(code) &&
			!/[{,]$/.test(code)
		);
	};

	return lines
		.map((line, i) => {
			if (inBlockComment) {
				if (line.includes('*/')) inBlockComment = false;
				return line;
			}
			if (line.trim().startsWith('/*')) {
				inBlockComment = !line.includes('*/');
				return line;
			}

			let [code, comment] = splitComment(line);
			const trimmed = code.trim();
			const depthBefore = parenDepth;
			parenDepth = Math.max(0, parenDepth + countParens(trimmed));

			code = code.replace(slashProps, (_, prop, value) => prop + value.replace(/\s*\/\s*/g, ' / '));

			if (!trimmed) return line;
			if (!inValue) declIndent = indentOf(code);
			const isStatement = inValue || declarationRe.test(trimmed) || statementAtRuleRe.test(trimmed);
			const continued = isStatement && continuesValue(i);
			inValue =
				isStatement &&
				(/[,:+\-*/]$/.test(trimmed) || continuationStartRe.test(nextCode(i)) || continued);

			const needsSemicolon =
				depthBefore === 0 &&
				parenDepth === 0 &&
				isStatement &&
				!continuedEndRe.test(trimmed) &&
				!/^[{]/.test(nextCode(i)) &&
				!continuationStartRe.test(nextCode(i)) &&
				!continued;

			if (needsSemicolon) code = code.trimEnd() + ';';
			return code + comment;
		})
		.join('\n');
}

export default {
	parsers: {
		scss: {
			...parsers.scss,
			preprocess: (text, options) =>
				parsers.scss.preprocess ? parsers.scss.preprocess(fixScss(text), options) : fixScss(text),
		},
	},
};
