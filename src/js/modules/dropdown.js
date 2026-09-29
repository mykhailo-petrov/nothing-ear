import { isMobile } from './mobile-detect.js';

export function initDropdownMenu() {
	const dropdownMenu = document.querySelectorAll('[data-dropdown]');

	if (!isMobile || !dropdownMenu.length) return;

	dropdownMenu.forEach((menu) => {
		const trigger = menu.querySelector('[data-dropdown-trigger]');

		trigger.addEventListener('click', (e) => {
			menu.classList.toggle('_open');
		});
	});
}
