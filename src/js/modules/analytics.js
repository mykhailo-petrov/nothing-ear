const GA_ID = import.meta.env.VITE_GA_ID;
const isEnabled = import.meta.env.PROD && Boolean(GA_ID);

export function trackEvent(name, params = {}) {
	if (!isEnabled) return;
	window.gtag('event', name, params);
}

export function initAnalytics() {
	if (!isEnabled) return;

	const script = document.createElement('script');
	script.async = true;
	script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
	document.head.append(script);

	window.dataLayer = window.dataLayer || [];
	window.gtag = function () {
		window.dataLayer.push(arguments);
	};
	window.gtag('js', new Date());
	window.gtag('config', GA_ID);

	document.addEventListener('click', (e) => {
		const target = e.target.closest('[data-analytics]');
		if (!target) return;

		trackEvent(target.dataset.analytics, {
			label: target.textContent.trim(),
		});
	});
}
