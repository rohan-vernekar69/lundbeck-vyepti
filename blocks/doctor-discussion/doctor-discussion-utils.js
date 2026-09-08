import { DOCTOR_DISCUSSION_CONFIGS } from '../../scripts/config.js';

// Constants

export const {
  PDF_DOWNLOAD_API_URL,
  EMAIL_SUBMIT_API_URL,
  EMAIL_FORM_TYPE,
  EMAIL_JOBCODE,
} = DOCTOR_DISCUSSION_CONFIGS;

export const PDF_ERROR_ELEMENT_ID = 'dg-pdf-error-msg';
export const PDF_POPUP_BLOCKED_ELEMENT_ID = 'dg-pdf-popup-blocked';
export const THANKYOU_MODAL_ID = 'dg-thankyou-modal';

// DOM helpers

export function capitalizeName(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Create a DOM element with attributes and children.
 * @param {string} tag
 * @param {Object} attrs
 * @param {...(Node|string)} children
 * @returns {HTMLElement}
 */
export function createEl(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === 'className') {
      el.className = value;
    } else {
      el.setAttribute(key, value);
    }
  });
  children.forEach((child) => {
    if (child === undefined || child === null) return;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return el;
}

// Modal-controller registry

const modalControllers = new WeakMap();

export function setModalController(modalEl, controller) {
  modalControllers.set(modalEl, controller);
}

export function getModalController(modalEl) {
  return modalControllers.get(modalEl);
}