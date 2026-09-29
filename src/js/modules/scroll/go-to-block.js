import { menuClose } from '@js/modules/functions.js';

export const gotoBlock = (targetBlock, noHeader = false, speed = 500, offsetTop = 0) => {
	const targetBlockElement = document.querySelector(targetBlock);
	if (targetBlockElement) {
		let headerItemHeight = 0;
		if (noHeader) {
			const headerElement = document.querySelector('header.header');
			if (!headerElement.classList.contains('_header-scroll')) {
				headerElement.style.cssText = `transition-duration: 0s;`;
				headerElement.classList.add('_header-scroll');
				headerItemHeight = headerElement.offsetHeight;
				headerElement.classList.remove('_header-scroll');
				setTimeout(() => {
					headerElement.style.cssText = ``;
				}, 0);
			} else {
				headerItemHeight = headerElement.offsetHeight;
			}
		}

		if (document.documentElement.classList.contains('burger-open')) menuClose();

		let targetBlockElementPosition = targetBlockElement.getBoundingClientRect().top + scrollY;
		targetBlockElementPosition = headerItemHeight
			? targetBlockElementPosition - headerItemHeight
			: targetBlockElementPosition;
		targetBlockElementPosition = offsetTop
			? targetBlockElementPosition - offsetTop
			: targetBlockElementPosition;
		window.scrollTo({
			top: targetBlockElementPosition,
			behavior: 'smooth',
		});
	}
};
