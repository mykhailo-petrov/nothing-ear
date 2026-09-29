import { myModules } from '@js/modules/registry.js';
import { gotoBlock } from '@js/modules/scroll/go-to-block.js';

export function pageNavigation() {
	document.addEventListener('click', pageNavigationAction);

	function pageNavigationAction(e) {
		if (e.target.closest('[data-goto]')) {
			const gotoLink = e.target.closest('[data-goto]');
			const gotoLinkSelector = gotoLink.dataset.goto ? gotoLink.dataset.goto : '';
			const noHeader = gotoLink.hasAttribute('data-goto-header');
			const gotoSpeed = gotoLink.dataset.gotoSpeed ? gotoLink.dataset.gotoSpeed : 500;
			const offsetTop = gotoLink.dataset.gotoTop ? parseInt(gotoLink.dataset.gotoTop) : 0;
			gotoBlock(gotoLinkSelector, noHeader, gotoSpeed, offsetTop);
			e.preventDefault();
		}
	}

	if (getHashFromUrl()) {
		let goToHash;
		if (document.querySelector(`#${getHashFromUrl()}`)) {
			goToHash = `#${getHashFromUrl()}`;
		} else if (document.querySelector(`.${getHashFromUrl()}`)) {
			goToHash = `.${getHashFromUrl()}`;
		}
		if (goToHash) gotoBlock(goToHash, true, 500, 20);
	}

	function getHashFromUrl() {
		if (location.hash) return location.hash.replace('#', '');
	}
}
