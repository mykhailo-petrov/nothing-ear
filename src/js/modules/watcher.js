import { isPrefersReduced, isScrollDown } from '@js/modules/utils.js';

function thresholdValidate(threshold) {
	if (Number.isNaN(threshold) || threshold < 0 || threshold > 1) {
		throw new Error(`threshold должен быть числом от 0 до 1, получено "${threshold}"`);
	}
}

function parseParams(value) {
	const [rawThresholdIn = '', rawThresholdOut = '', rawRootMargin = '', rawOnce = ''] = value
		.split(',')
		.map((part) => part.trim());
	const thresholdIn = rawThresholdIn === '' ? 0 : Number(rawThresholdIn);
	const thresholdOutDef = Number((1 - thresholdIn).toFixed(2));
	const thresholdOut = rawThresholdOut === '' ? thresholdOutDef : Number(rawThresholdOut);

	thresholdValidate(thresholdIn);
	thresholdValidate(thresholdOut);

	return {
		thresholdIn,
		thresholdOut,
		rootMargin: rawRootMargin || '0px',
		once: rawOnce === 'once',
	};
}

function watcherEnter(target, once, observer) {
	if (!target.classList.contains('_watcher')) {
		target.classList.add('_watcher');
		target.dispatchEvent(new CustomEvent('watcher:enter'));
	}

	if (once) observer.unobserve(target);
}

function watcherOut(target) {
	if (target.classList.contains('_watcher')) {
		target.classList.remove('_watcher');
		target.dispatchEvent(new CustomEvent('watcher:out'));
	}
}

export function initWatcher() {
	if (isPrefersReduced) {
		document.documentElement.classList.add('is-prefers-reduced', '_watcher');
		return;
	}
	const observers = new Map();

	document.querySelectorAll('[data-watcher]').forEach((element) => {
		try {
			const { thresholdIn, thresholdOut, rootMargin, once } = parseParams(element.dataset.watcher);
			const key = `${thresholdIn}|${thresholdOut}|${rootMargin}|${once}`;

			if (!observers.has(key)) {
				const observer = new IntersectionObserver(
					(records) => {
						records.forEach((record) => {
							const { target, isIntersecting, intersectionRatio } = record;
							const showThreshold = isScrollDown()
								? thresholdIn
								: Math.min(thresholdIn, thresholdOut);

							if (isIntersecting && intersectionRatio >= showThreshold) {
								watcherEnter(target, once, observer);
							} else if (!isIntersecting || intersectionRatio <= thresholdOut) {
								watcherOut(target);
							}
						});
					},
					{ threshold: [thresholdIn, thresholdOut], rootMargin }
				);

				observers.set(key, observer);
			}

			observers.get(key).observe(element);
		} catch (error) {
			console.warn('[watcher] Неверный data-watcher:', element, error.message);
		}
	});
}
