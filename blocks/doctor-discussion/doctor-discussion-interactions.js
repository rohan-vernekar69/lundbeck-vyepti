import {
  createEl, EMAIL_SUBMIT_API_URL, THANKYOU_MODAL_ID,
  setModalController, getModalController,
} from './doctor-discussion-utils.js';
import { renderInlineLinks } from './doctor-discussion-markdown.js';
import createEmailModalController from './doctor-discussion-email-modal.js';
import createThankYouModalController from './doctor-discussion-thankyou-modal.js';


// Email modal

// Toggles a field's invalid state + error message on input/blur.
function refreshFieldValidity(input, errorEl) {
  const valid = input.checkValidity();
  input.classList.toggle('is-invalid', !valid);
  errorEl.classList.toggle('d-none', valid);

  if (valid) return;

  errorEl.textContent = input.validity.valueMissing
    ? errorEl.dataset.emptyMessage
    : errorEl.dataset.invalidMessage;
}

// Builds the email modal's DOM.
function buildEmailModalMarkup(emailUrl, modalConfig) {
  const config = modalConfig || {};
  const errors = config.errors || {};

  // Letters/spaces/apostrophes/hyphens only (hyphen must stay escaped).
  const NAME_PATTERN = "[A-Za-z\\s'\\-]+";

  const firstNameInput = createEl('input', {
    type: 'text', id: 'FirstName', name: 'FirstName', className: 'dg-modal-input', required: '', pattern: NAME_PATTERN,
  });
  const lastNameInput = createEl('input', {
    type: 'text', id: 'LastName', name: 'LastName', className: 'dg-modal-input', required: '', pattern: NAME_PATTERN,
  });
  // Stricter than native type="email" alone (requires a letters-only 2+ char TLD).
  const EMAIL_PATTERN = "[^\\s@]+@[^\\s@]+\\.[A-Za-z]{2,}";

  const emailInput = createEl('input', {
    type: 'email', id: 'Email', name: 'Email', className: 'dg-modal-input', required: '', pattern: EMAIL_PATTERN,
  });
  const consentInput = createEl('input', {
    type: 'checkbox', id: 'Consent', name: 'Consent', className: 'dg-modal-consent-input', required: '',
  });

  // Carries both empty/invalid messages as data attrs for refreshFieldValidity().
  const firstNameError = createEl('p', {
    id: 'FirstName-error',
    className: 'dg-modal-field-error d-none',
    'data-empty-message': errors.firstNameEmpty,
    'data-invalid-message': errors.firstNameInvalid,
  }, errors.firstNameEmpty);
  const lastNameError = createEl('p', {
    id: 'LastName-error',
    className: 'dg-modal-field-error d-none',
    'data-empty-message': errors.lastNameEmpty,
    'data-invalid-message': errors.lastNameInvalid,
  }, errors.lastNameEmpty);
  const emailError = createEl('p', {
    id: 'Email-error',
    className: 'dg-modal-field-error d-none',
    'data-empty-message': errors.emailEmpty,
    'data-invalid-message': errors.emailInvalid,
  }, errors.emailEmpty);
  const consentError = createEl('p', { id: 'Consent-error', className: 'dg-modal-field-error d-none' }, errors.consent);

  const submitBtn = createEl('button', { type: 'submit', className: 'dg-modal-send-btn send-email' },
    createEl('span', {}, config.sendLabel),
    createEl('span', { className: 'dg-modal-send-arrow', 'aria-hidden': 'true' }),
  );
  const closeBtn = createEl('button', { type: 'button', className: 'dg-modal-close-btn close', 'aria-label': 'Close' });

  const requiredNote = createEl('p', { className: 'dg-modal-required-note' }, config.requiredNote);

  // Each consent paragraph may contain "[label](url)" links (Terms/Privacy).
  const consentTextEl = createEl('span', { className: 'dg-modal-consent-text' });
  (config.consentParagraphs || []).forEach((paragraph) => {
    consentTextEl.append(createEl(
      'span',
      { className: 'dg-modal-consent-paragraph' },
      ...renderInlineLinks(paragraph, 'dg-modal-legal-link'),
    ));
  });

  // Omits the whole consent row (and its input) if unauthored.
  const consentRow = (config.consentParagraphs || []).length
    ? createEl('label', { className: 'dg-modal-consent-row', for: 'Consent' },
        consentInput,
        createEl('div', { className: 'dg-modal-consent-content' },
          consentTextEl,
          consentError,
        ),
      )
    : null;

  // Only bind if the row was actually rendered above.
  if (consentRow) {
    consentInput.addEventListener('change', () => {
      consentInput.classList.toggle('is-invalid', !consentInput.checked);
      if (consentInput.checked) consentError.classList.add('d-none');
    });
  }

  // Omits the field entirely (input included) if its label was left unauthored.
  function buildTextField(id, label, input, errorEl) {
    if (!label) return null;
    return createEl('div', { className: 'dg-modal-field' },
      createEl('label', { className: 'dg-modal-field-label', for: id }, label),
      input,
      errorEl,
    );
  }

  const firstNameField = buildTextField('FirstName', config.firstNameLabel, firstNameInput, firstNameError);
  const lastNameField = buildTextField('LastName', config.lastNameLabel, lastNameInput, lastNameError);
  const emailField = buildTextField('Email', config.emailLabel, emailInput, emailError);

  // Live-validate only the fields that actually made it into the modal.
  [
    [firstNameField, firstNameInput, firstNameError],
    [lastNameField, lastNameInput, lastNameError],
    [emailField, emailInput, emailError],
  ].forEach(([fieldEl, input, errorEl]) => {
    if (!fieldEl) return;
    input.addEventListener('input', () => refreshFieldValidity(input, errorEl));
    input.addEventListener('blur', () => refreshFieldValidity(input, errorEl));
  });

  // data-submit: authored override, else the hardcoded EMAIL_SUBMIT_API_URL.
  const form = createEl('form', { id: 'emailForm', className: 'dg-modal-form', 'data-submit': emailUrl || EMAIL_SUBMIT_API_URL, novalidate: '' },
    requiredNote,
    firstNameField,
    lastNameField,
    emailField,
    consentRow,
    submitBtn,
  );

  const headerTitle = createEl('h2', { className: 'header-title dg-modal-title' }, config.title);
  const errorMsg = createEl('div', { className: 'error-message d-none' }, errors.generic);
  const patientFormContainer = createEl('div', { className: 'patient-form-container' }, form);

  // On submit, this modal closes and the Thank You modal opens instead.
  const modalContent = createEl('div', { className: 'modal-content' },
    closeBtn, headerTitle, patientFormContainer, errorMsg,
  );
  const modalDialog = createEl('div', { className: 'modal-dialog' }, modalContent);
  const modal = createEl('div', { id: 'mq-modal', className: 'modal', tabindex: '-1' }, modalDialog);

  return {
    modal, form, closeBtn, submitBtn,
  };
}

// Builds the email modal once, reusing its controller on later opens.
export function getOrCreateEmailModal(quizData, emailUrl, apiUsername, apiPassword, modalConfig) {
  const modalEl = document.getElementById('mq-modal');
  if (modalEl) return getModalController(modalEl);

  const {
    modal, closeBtn, submitBtn,
  } = buildEmailModalMarkup(emailUrl, modalConfig);
  document.body.append(modal);

  const controller = createEmailModalController({
    modalId: 'mq-modal',
    formId: 'emailForm',
    quizData,
    apiUsername,
    apiPassword,
  });

  closeBtn.addEventListener('click', () => controller.close());
  submitBtn.addEventListener('click', (e) => controller.handleSubmit(e));

  setModalController(modal, controller);
  return controller;
}

// Thank-you modal

// Splits a "one paragraph with a <br>" node into two separate paragraphs.
function splitParagraphsAtBreaks(nodes) {
  const result = [];

  nodes.forEach((node) => {
    const isSplittableParagraph = node instanceof HTMLElement
      && node.tagName.toLowerCase() === 'p'
      && node.querySelector('br');

    if (!isSplittableParagraph) {
      result.push(node);
      return;
    }

    const before = document.createElement('p');
    const after = document.createElement('p');
    let target = before;
    let brSeen = false;

    [...node.childNodes].forEach((child) => {
      if (!brSeen && child.nodeName.toLowerCase() === 'br') {
        brSeen = true;
        target = after;
        return;
      }
      target.append(child.cloneNode(true));
    });

    before.textContent = before.textContent.trim();
    after.textContent = after.textContent.trim();

    if (before.textContent) result.push(before);
    if (after.textContent) result.push(after);
  });

  return result;
}

// Auto-assigns heading/message/icon classes to thank-you content nodes.
function classifyThankYouContent(nodes) {
  let headingAssigned = false;

  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const tag = node.tagName.toLowerCase();

    if (tag === 'picture') {
      node.querySelector('img')?.classList.add('dg-thankyou-icon');
      return;
    }
    if (tag === 'img') {
      node.classList.add('dg-thankyou-icon');
      return;
    }
    if (/^h[1-6]$/.test(tag)) {
      node.classList.add('dg-thankyou-heading');
      headingAssigned = true;
      return;
    }
    if (tag === 'p') {
      if (!headingAssigned) {
        node.classList.add('dg-thankyou-heading');
        headingAssigned = true;
      } else {
        node.classList.add('dg-thankyou-message');
      }
    }
  });
}

// Builds the Thank You modal from the authored thank-you row content.
export function buildThankYouModal(thankYouContent = []) {
  if (!thankYouContent.length || document.getElementById(THANKYOU_MODAL_ID)) return;

  const content = splitParagraphsAtBreaks(thankYouContent);
  classifyThankYouContent(content);

  const closeBtn = createEl('button', {
    type: 'button', className: 'dg-thankyou-close-btn close', 'aria-label': 'Close',
  });
  const modalContent = createEl('div', { className: 'modal-content dg-thankyou-content' },
    closeBtn,
    ...content,
  );
  const modalDialog = createEl('div', { className: 'modal-dialog' }, modalContent);
  const modal = createEl('div', { id: THANKYOU_MODAL_ID, className: 'modal', tabindex: '-1' }, modalDialog);
  // FOUC guard — inline style takes effect before CSS may have loaded.
  modal.style.display = 'none';

  document.body.append(modal);

  const controller = createThankYouModalController({ modalId: THANKYOU_MODAL_ID });
  closeBtn.addEventListener('click', () => controller.close());
  setModalController(modal, controller);
}