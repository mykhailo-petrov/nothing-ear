export let bodyLockStatus = true;

export const bodyLockToggle = (delay = 500) => {
	if (document.documentElement.classList.contains('lock')) {
		bodyUnlock(delay);
	} else {
		bodyLock(delay);
	}
};

export const bodyUnlock = (delay = 500) => {
	const body = document.querySelector('body');
	if (bodyLockStatus) {
		const lockPadding = document.querySelectorAll('[data-lp]');
		setTimeout(() => {
			for (let index = 0; index < lockPadding.length; index++) {
				lockPadding[index].style.paddingRight = '0px';
			}
			body.style.paddingRight = '0px';
			document.documentElement.classList.remove('lock');
		}, delay);
		bodyLockStatus = false;
		setTimeout(function () {
			bodyLockStatus = true;
		}, delay);
	}
};

export const bodyLock = (delay = 500) => {
	const body = document.querySelector('body');
	if (bodyLockStatus) {
		const lockPadding = document.querySelectorAll('[data-lp]');
		for (let index = 0; index < lockPadding.length; index++) {
			lockPadding[index].style.paddingRight =
				window.innerWidth - document.querySelector('.wrapper').offsetWidth + 'px';
		}
		body.style.paddingRight =
			window.innerWidth - document.querySelector('.wrapper').offsetWidth + 'px';
		document.documentElement.classList.add('lock');

		bodyLockStatus = false;
		setTimeout(function () {
			bodyLockStatus = true;
		}, delay);
	}
};
