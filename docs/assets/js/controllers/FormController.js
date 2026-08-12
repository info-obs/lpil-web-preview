/**
 * FormController
 * Responsibilities:
 *  - Client-side validation for .contact-form and .inquiry-form
 *  - Shows / hides .field-error messages
 *  - Shows .form-status on submit success / error
 *  - Delegates actual submission to the backend (WordPress ajax or REST)
 */
import { $, $$ } from '../utils/dom.js';

export class FormController {
  init() {
    $$('.contact-form, .inquiry-form').forEach((form) => {
      form.addEventListener('submit', (e) => this._onSubmit(e, form));
    });
  }

  _onSubmit(e, form) {
    e.preventDefault();
    const valid = this._validate(form);
    if (!valid) return;

    // Scaffold — replace with fetch() call when backend is ready
    const status = form.querySelector('.form-status');
    if (status) {
      status.className = 'form-status success';
      status.textContent = 'Thank you. Your message has been sent.';
    }
  }

  _validate(form) {
    let valid = true;
    const required = form.querySelectorAll('[required]');

    required.forEach((field) => {
      const error = form.querySelector(`[data-error="${field.name}"]`);
      const empty = !field.value.trim();

      field.classList.toggle('error', empty);
      if (error) error.style.display = empty ? 'block' : 'none';
      if (empty) valid = false;
    });

    return valid;
  }
}
