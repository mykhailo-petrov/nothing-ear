import { bodyLock, bodyUnlock, bodyLockStatus } from './body-lock.js';

export function initBurgerMenu() {
	if (document.querySelector('.burger-menu')) {
		document.addEventListener('click', function (e) {
			if (bodyLockStatus && e.target.closest('.burger-menu')) {
				menuToggle();
			}
		});
	}
}

function menuToggle() {
	if (document.documentElement.classList.contains('burger-open')) {
		menuClose();
	} else {
		menuOpen();
	}
}

export function menuOpen() {
	bodyLock();
	document.documentElement.classList.add('burger-open');
}

export function menuClose() {
	document.querySelectorAll('[data-dropdown]').forEach((dropdownMenu) => {
		dropdownMenu.classList.remove('_open');
	});

	bodyUnlock();
	document.documentElement.classList.remove('burger-open');
}
