import FetchWrapper from '@js/modules/api/index.js';

function validateField(field) {
	if (!field.willValidate) return true;

	const valid = field.checkValidity();
	field.classList.toggle('_form-error', !valid);
	field.setAttribute('aria-invalid', String(!valid));

	let message = field.parentElement.querySelector('.form-error-text');

	if (!valid) {
		if (!message) {
			message = document.createElement('span');
			message.className = 'form-error-text';
			field.parentElement.append(message);
		}
		message.textContent = field.validationMessage;
	} else {
		message?.remove();
	}

	return valid;
}

export function initForms() {
	document.addEventListener('focusin', (e) => {
		const target = e.target;

		if (!target.closest('form')) return;
		target.classList.add('_form-focus');
		target.classList.remove('_form-error');
	});
	document.addEventListener('focusout', (e) => {
		const target = e.target;

		if (!target.closest('form')) return;
		target.classList.remove('_form-focus');

		if ('touched' in target.dataset) validateField(target);
	});
	['input', 'change'].forEach((type) => {
		document.addEventListener(type, (e) => {
			const target = e.target;

			if (!target.closest?.('form') || !target.willValidate) return;
			target.dataset.touched = '';

			if (target.getAttribute('aria-invalid') === 'true') validateField(target);
		});
	});
	document.addEventListener('submit', (e) => {
		const form = e.target;
		if (!form.hasAttribute('novalidate')) return;
		e.preventDefault();

		const requiredFields = [...form.elements].filter((el) => el.required);
		requiredFields.forEach((el) => (el.dataset.touched = ''));
		const errors = requiredFields.filter((el) => !validateField(el));

		if (errors.length) {
			errors[0].focus();
			return;
		}

		sendForm(form);
	});
}

async function sendForm(form) {
	const button = form.querySelector('[type="submit"]');
	button?.setAttribute('disabled', '');

	const body = Object.fromEntries(new FormData(form));
	const API = new FetchWrapper(import.meta.env.VITE_API_URL);

	try {
		const { data } = await API.post('/posts', body);

		form.reset();
		[...form.elements].forEach((el) => {
			delete el.dataset.touched;
			el.classList.remove('_form-error');
			el.removeAttribute('aria-invalid');
		});
		form.dispatchEvent(new CustomEvent('form:sent', { detail: { data } }));
	} catch (error) {
		form.dispatchEvent(new CustomEvent('form:error', { detail: { error } }));
	} finally {
		button?.removeAttribute('disabled');
	}
}
