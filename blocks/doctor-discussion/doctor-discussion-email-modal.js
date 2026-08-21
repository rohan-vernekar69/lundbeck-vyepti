import { lockBodyScroll, unlockBodyScroll } from './doctor-discussion-modal-utils.js';
import {
  EMAIL_FORM_TYPE, EMAIL_JOBCODE, PDF_DOWNLOAD_API_USERNAME, PDF_DOWNLOAD_API_PASSWORD,
} from './doctor-discussion-utils.js';

/**
 * Returns the right error message (empty vs. invalid) using the
 * data-empty-message/data-invalid-message attrs set in buildEmailModalMarkup().
 *
 * @param {HTMLInputElement} input
 * @param {HTMLElement} errorEl
 * @returns {string}
 */
function getFieldErrorMessage(input, errorEl) {
  if (!input || !errorEl) return '';
  if (input.validity.valueMissing) return errorEl.dataset.emptyMessage || '';
  return errorEl.dataset.invalidMessage || '';
}

/**
 * Initializes and manages the Email Popup Modal.
 *
 * @param {Object} config
 * @param {string} config.modalId - Modal element ID (e.g., 'mq-modal')
 * @param {string} config.formId - Form element ID (e.g., 'emailForm')
 * @param {Object} config.quizData - Flattened legacy answers payload (e.g. { fname, q1a1, ... }),
 *                                   already built via buildLegacyAnswersPayload() — see
 *                                   getOrCreateEmailModal() in doctor-discussion-interactions.js.
 * @returns {{ open: Function, close: Function, handleSubmit: Function }}
 */
export default function createEmailModalController({ modalId = "mq-modal", formId = "emailForm", quizData = {} } = {}) {
  const modal = document.getElementById(modalId);
  const form = document.getElementById(formId);

  // Helper to clear label focus styling on form reset.

  function clearLabelFocus(inputId) {
    const input = document.getElementById(inputId);
    if (input && input.labels && input.labels[0]) {
      input.labels[0].classList.remove("focus");
    }
  }

  // Prepares inner container states prior to opening modal.

  function resetModalState() {
    const formContainer = modal.querySelector(".patient-form-container");
    const errorMsg = modal.querySelector(".error-message");

    if (formContainer) formContainer.classList.remove("d-none");
    if (errorMsg) errorMsg.classList.add("d-none");

    const firstNameInput = document.getElementById("FirstName");
    const lastNameInput = document.getElementById("LastName");
    const emailInput = document.getElementById("Email");
    const consentInput = document.getElementById("Consent");

    const firstNameErr = document.getElementById("FirstName-error");
    const lastNameErr = document.getElementById("LastName-error");
    const emailErr = document.getElementById("Email-error");
    const consentErr = document.getElementById("Consent-error");

    // Hide errors and reset their text back to the "empty" message so a
    // stale "invalid" message from a previous visit isn't left behind.
    [firstNameErr, lastNameErr, emailErr].forEach((errorEl) => {
      if (!errorEl) return;
      errorEl.style.display = "none";
      errorEl.textContent = errorEl.dataset.emptyMessage || errorEl.textContent;
    });
    if (consentErr) consentErr.style.display = "none";

    [firstNameInput, lastNameInput, emailInput, consentInput].forEach((input) => {
      input?.classList.remove("is-invalid");
    });
  }

  // Forward-declared: close() and handleOutsideClick() call each other, so
  // close() needs this before handleOutsideClick is assigned below.
  let handleOutsideClick;

  // Closes modal, unlocks scroll, resets form, cleans up listeners.
  // Defined above handleOutsideClick since the two reference each other.

  function close() {
    if (!modal) return;

    modal.classList.remove("show");
    modal.style.display = "none";

    unlockBodyScroll();

    // Reset form and focus styles
    if (form) form.reset();
    clearLabelFocus("FirstName");
    clearLabelFocus("LastName");
    clearLabelFocus("Email");

    // Cleanup click-outside listener
    document.body.removeEventListener("click", handleOutsideClick);
  }

  // Closes modal if user clicks the backdrop (the .modal wrapper itself)
  // outside the .modal-dialog content.

  handleOutsideClick = (event) => {
    const modalDialog = modal.querySelector(".modal-dialog");
    if (modalDialog && !modalDialog.contains(event.target)) {
      close();
    }
  };

  // Opens modal. 

  function open() {
    if (!modal) return;

    resetModalState();

    modal.classList.add("show");
    modal.style.display = "flex";

    lockBodyScroll();

    // Listen for outside clicks
    setTimeout(() => {
      document.body.addEventListener("click", handleOutsideClick);
    }, 0);
  }

  /**
   * Validates a single field: toggles is-invalid and shows/hides its
   * error message. Extracted so validateFormFields() stays a flat list of calls.
   *
   * @param {HTMLInputElement|null} input
   * @param {HTMLElement|null} errorEl
   * @returns {boolean} whether the field is valid
   */
  function applyFieldValidation(input, errorEl) {
    const valid = !!input?.validity.valid;
    input?.classList.toggle("is-invalid", !valid);
    if (errorEl) {
      if (!valid) errorEl.textContent = getFieldErrorMessage(input, errorEl);
      errorEl.style.display = valid ? "none" : "block";
    }
    return valid;
  }

  /**
   * Same as applyFieldValidation() but for the consent checkbox — validated
   * by "checked", with just one error message.
   *
   * @param {HTMLInputElement|null} consentInput
   * @param {HTMLElement|null} consentErr
   * @returns {boolean} whether consent is valid (checked)
   */
  function applyConsentValidation(consentInput, consentErr) {
    const valid = !!consentInput?.checked;
    consentInput?.classList.toggle("is-invalid", !valid);
    if (consentErr) consentErr.style.display = valid ? "none" : "block";
    return valid;
  }

  /**
   * Validates all form fields and toggles their error states.
   * Extracted from handleSubmit to keep it simple.
   *
   * @returns {{ isValid: boolean, firstNameInput: Element, lastNameInput: Element,
   *             emailInput: Element, consentInput: Element }}
   */
  function validateFormFields() {
    const firstNameInput = document.getElementById("FirstName");
    const lastNameInput = document.getElementById("LastName");
    const emailInput = document.getElementById("Email");
    const consentInput = document.getElementById("Consent");

    const isFirstNameValid = applyFieldValidation(firstNameInput, document.getElementById("FirstName-error"));
    const isLastNameValid = applyFieldValidation(lastNameInput, document.getElementById("LastName-error"));
    const isEmailValid = applyFieldValidation(emailInput, document.getElementById("Email-error"));
    const isConsentValid = applyConsentValidation(consentInput, document.getElementById("Consent-error"));

    const isValid = isFirstNameValid && isLastNameValid && isEmailValid && isConsentValid;

    return {
      isValid, firstNameInput, lastNameInput, emailInput, consentInput,
    };
  }

  /**
   * Validates inputs and posts the combined quiz payload + user data to the
   * sendemail API as form-urlencoded data (confirmed via live network
   * capture — the API does not accept JSON).
   *
   * @param {Event} event
   */
  async function handleSubmit(event) {
    event.preventDefault();

    const errorMsg = modal.querySelector(".error-message");
    const {
      isValid, firstNameInput, lastNameInput, emailInput, consentInput,
    } = validateFormFields();

    if (!isValid) return;

    // Build the form-urlencoded payload matching the sendemail API
    const payload = new URLSearchParams({
      FormType: EMAIL_FORM_TYPE,
      Jobcode: EMAIL_JOBCODE,
      FirstName: firstNameInput.value,
      LastName: lastNameInput.value,
      Email: emailInput.value,
      ConsentCheckBox: consentInput.checked,
      ...quizData,
    });

    // Close the email modal and hand off to the Thank You modal.
    function handleSuccess() {
      if (errorMsg) errorMsg.classList.add("d-none");
      close();
      document.dispatchEvent(new CustomEvent("dg:email-success", {
        bubbles: true,
        detail: { quizData: Object.fromEntries(payload) },
      }));
    }

    const submitUrl = form.getAttribute("data-submit");

    // Stage proxy requires the same Basic Auth as the PDF endpoint
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (PDF_DOWNLOAD_API_USERNAME && PDF_DOWNLOAD_API_PASSWORD) {
      const credentials = `${PDF_DOWNLOAD_API_USERNAME}:${PDF_DOWNLOAD_API_PASSWORD}`;
      headers.Authorization = `Basic ${btoa(credentials)}`;
    }

    try {
      const response = await fetch(submitUrl, {
        method: "POST",
        headers,
        body: payload.toString(),
      });

      if (!response.ok) throw new Error("API response error");

      const data = await response.json();

      if (data === true) {
        handleSuccess();
      } else if (errorMsg) {
        errorMsg.classList.remove("d-none");
      }
    } catch (err) {
      document.dispatchEvent(new CustomEvent("dg:email-error", { bubbles: true, detail: { error: err } }));
      if (errorMsg) errorMsg.classList.remove("d-none");
    }
  }

  return { open, close, handleSubmit };
}