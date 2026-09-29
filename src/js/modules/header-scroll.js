export function initHeaderScroll() {
	const header = document.querySelector('[data-header]');

	if (!header) return;

	const val = parseInt(header.dataset.header);
	const SCROLL_OFFSET = Number.isNaN(val) ? 0 : val;
	const SCROLL_THRESHOLD = 10;

	let lastScroll = 0;
	const scrollHandler = () => {
		const currentScroll = window.scrollY;
		const scrollDifference = currentScroll - lastScroll;

		if (currentScroll <= SCROLL_OFFSET) {
			header.classList.remove('_scroll', '_show');
			lastScroll = currentScroll;
			return;
		}

		if (Math.abs(scrollDifference) < SCROLL_THRESHOLD) {
			return;
		}

		if (scrollDifference > 0) {
			header.classList.add('_scroll');
			header.classList.remove('_show');
		} else {
			header.classList.add('_scroll', '_show');
		}

		lastScroll = currentScroll;
	};

	window.addEventListener('scroll', scrollHandler, { passive: true });
	scrollHandler();
}
