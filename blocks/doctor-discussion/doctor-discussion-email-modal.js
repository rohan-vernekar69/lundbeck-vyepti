import { lockBodyScroll, unlockBodyScroll } from './doctor-discussion-modal-utils.js';
import { EMAIL_FORM_TYPE, EMAIL_JOBCODE } from './doctor-discussion-utils.js';

// Picks the right error message (empty vs. invalid) via the field's data attrs.
function getFieldErrorMessage(input, errorEl) {
  if (!input || !errorEl) return '';
  if (input.validity.valueMissing) return errorEl.dataset.emptyMessage || '';
  return errorEl.dataset.invalidMessage || '';
}

// Initializes and manages the Email Popup Modal. apiUsername/apiPassword
// are authored overrides — if either is missing, no Authorization header is sent.
export default function createEmailModalController({
  modalId = "mq-modal", formId = "emailForm", quizData = {}, apiUsername = null, apiPassword = null,
} = {}) {
  const modal = document.getElementById(modalId);
  const form = document.getElementById(formId);

  // Clears label focus styling on form reset.
  function clearLabelFocus(inputId) {
    const input = document.getElementById(inputId);
    if (input && input.labels && input.labels[0]) {
      input.labels[0].classList.remove("focus");
    }
  }

  // Resets the modal's inner state before it's opened.
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

    // Reset error text back to the "empty" message so a stale "invalid" doesn't linger.
    [firstNameErr, lastNameErr, emailErr].forEach((errorEl) => {
      if (!errorEl) return;
      errorEl.classList.add("d-none");
      errorEl.textContent = errorEl.dataset.emptyMessage || errorEl.textContent;
    });
    if (consentErr) consentErr.classList.add("d-none");

    [firstNameInput, lastNameInput, emailInput, consentInput].forEach((input) => {
      input?.classList.remove("is-invalid");
    });
  }

  // Forward-declared: close()/handleOutsideClick() reference each other.
  let handleOutsideClick;

  // Closes modal, unlocks scroll, resets form, cleans up listeners.
  function close() {
    if (!modal) return;

    modal.classList.remove("show");

    unlockBodyScroll();

    if (form) form.reset();
    clearLabelFocus("FirstName");
    clearLabelFocus("LastName");
    clearLabelFocus("Email");

    document.body.removeEventListener("click", handleOutsideClick);
  }

  // Closes the modal on a backdrop click (outside .modal-dialog).
  handleOutsideClick = (event) => {
    const modalDialog = modal.querySelector(".modal-dialog");
    if (modalDialog && !modalDialog.contains(event.target)) {
      close();
    }
  };

  // Opens the modal.
  function open() {
    if (!modal) return;

    resetModalState();

    modal.classList.add("show");

    lockBodyScroll();

    setTimeout(() => {
      document.body.addEventListener("click", handleOutsideClick);
    }, 0);
  }

  // Validates one field, toggling its invalid state + error message.
  function applyFieldValidation(input, errorEl) {
    // Unauthored field (never rendered) — nothing to validate.
    if (!input) return true;
    const valid = !!input?.validity.valid;
    input?.classList.toggle("is-invalid", !valid);
    if (errorEl) {
      if (!valid) errorEl.textContent = getFieldErrorMessage(input, errorEl);
      errorEl.classList.toggle("d-none", valid);
    }
    return valid;
  }

  // Same as applyFieldValidation(), but for the consent checkbox.
  function applyConsentValidation(consentInput, consentErr) {
    // Unauthored consent row (never rendered) — nothing to validate.
    if (!consentInput) return true;
    const valid = !!consentInput?.checked;
    consentInput?.classList.toggle("is-invalid", !valid);
    if (consentErr) consentErr.classList.toggle("d-none", valid);
    return valid;
  }

  // Validates every field and toggles their error states.
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

  // Validates inputs and posts the quiz + user data to the sendemail API
  // as form-urlencoded (it doesn't accept JSON).
  async function handleSubmit(event) {
    event.preventDefault();

    const errorMsg = modal.querySelector(".error-message");
    const {
      isValid, firstNameInput, lastNameInput, emailInput, consentInput,
    } = validateFormFields();

    if (!isValid) return;

    // Only includes fields that were actually rendered (unauthored = no input in the DOM).
    const payload = new URLSearchParams({
      FormType: EMAIL_FORM_TYPE,
      Jobcode: EMAIL_JOBCODE,
      ...(firstNameInput ? { FirstName: firstNameInput.value } : {}),
      ...(lastNameInput ? { LastName: lastNameInput.value } : {}),
      ...(emailInput ? { Email: emailInput.value } : {}),
      ...(consentInput ? { ConsentCheckBox: consentInput.checked } : {}),
      ...quizData,
    });

    // Closes the email modal and hands off to the Thank You modal.
    function handleSuccess() {
      if (errorMsg) errorMsg.classList.add("d-none");
      close();
      document.dispatchEvent(new CustomEvent("dg:email-success", {
        bubbles: true,
        detail: { quizData: Object.fromEntries(payload) },
      }));
    }

    const submitUrl = form.getAttribute("data-submit");

    // Stage proxy needs the same Basic Auth as the PDF endpoint.
    const headers = { "Content-Type": "application/x-www-form-urlencoded" };
    if (apiUsername && apiPassword) {
      const credentials = `${apiUsername}:${apiPassword}`;
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