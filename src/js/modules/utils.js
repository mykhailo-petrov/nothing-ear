export function setExclusiveActiveItem(curTarget, itemsRef, activeClass) {
	const activeItem = itemsRef.find((item) => item.classList.contains(activeClass));
	if (curTarget.classList.contains(activeClass)) return;
	if (!activeItem) curTarget.classList.add(activeClass);
	else {
		activeItem.classList.remove(activeClass);
		curTarget.classList.add(activeClass);
	}
}

export const isPrefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let lastScroll = window.scrollY;
let scrollDown = false;

window.addEventListener(
	'scroll',
	() => {
		const currentScroll = window.scrollY;

		if (currentScroll !== lastScroll) scrollDown = currentScroll > lastScroll;
		lastScroll = currentScroll;
	},
	{ passive: true }
);

export function isScrollDown() {
	return scrollDown;
}
