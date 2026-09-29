import { myModules } from '@js/modules/registry.js';

const yearElement = document.querySelector('[data-year]');
if (yearElement) {
	yearElement.textContent = new Date().getFullYear();
}

const feedbackForm = document.querySelector('.feedback-form');
const feedbackStatus = feedbackForm?.querySelector('.feedback-form__status');

const showFeedbackStatus = (text, isError = false) => {
	feedbackStatus.textContent = text;
	feedbackStatus.classList.toggle('_error', isError);
	feedbackStatus.hidden = false;
};

let feedbackCloseTimer;

feedbackForm?.addEventListener('form:sent', () => {
	showFeedbackStatus(`Mensagem enviada. Obrigado!`);

	feedbackCloseTimer = setTimeout(() => {
		myModules.popup?.close();
	}, 2000);
});

if (feedbackForm) {
	document.addEventListener('afterPopupClose', () => {
		clearTimeout(feedbackCloseTimer);
		feedbackStatus.hidden = true;
	});
}

feedbackForm?.addEventListener('form:error', (e) => {
	console.error(e.detail.error);
	showFeedbackStatus('Não foi possível enviar. Tente novamente.', true);
});
