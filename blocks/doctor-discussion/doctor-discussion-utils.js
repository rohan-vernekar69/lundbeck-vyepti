import { DOCTOR_DISCUSSION_CONFIGS } from '../../scripts/config.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// Default number of progress-dot segments shown when no total-steps row is authored.
export const TOTAL_STEPS_DEFAULT = 9;


export const {
  PDF_DOWNLOAD_API_URL,
  EMAIL_SUBMIT_API_URL,
  PDF_DOWNLOAD_API_USERNAME,
  PDF_DOWNLOAD_API_PASSWORD,
  EMAIL_FORM_TYPE,
  EMAIL_JOBCODE,
} = DOCTOR_DISCUSSION_CONFIGS;

export const PDF_ERROR_ELEMENT_ID = 'dg-pdf-error-msg';
export const PDF_POPUP_BLOCKED_ELEMENT_ID = 'dg-pdf-popup-blocked';
export const THANKYOU_MODAL_ID = 'dg-thankyou-modal';

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

// Blocked keys, to guard the answers store against prototype pollution.
const UNSAFE_ANSWER_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

// Safely reads a dynamic field-name key off the shared answers object.
export function getAnswer(answers, key) {
  if (UNSAFE_ANSWER_KEYS.has(key) || !Object.prototype.hasOwnProperty.call(answers, key)) {
    return undefined;
  }
  return Reflect.get(answers, key);
}

// Safely writes a dynamic field-name key onto the shared answers object.
export function setAnswer(answers, key, value) {
  if (UNSAFE_ANSWER_KEYS.has(key)) return;
  Object.defineProperty(answers, key, {
    value, writable: true, enumerable: true, configurable: true,
  });
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

// ---------------------------------------------------------------------------
// Modal-controller registry
// ---------------------------------------------------------------------------

const modalControllers = new WeakMap();

export function setModalController(modalEl, controller) {
  modalControllers.set(modalEl, controller);
}

export function getModalController(modalEl) {
  return modalControllers.get(modalEl);
}

// ---------------------------------------------------------------------------
// Legacy answers payload (shared by PDF + Email APIs)
// ---------------------------------------------------------------------------

/**
 * Resolves the legacy aM suffix for one selected answer.
 * Radio fields are always a1; checkbox fields use the option's 1-based
 * index within field.options so aM stays stable regardless of selection order.
 *
 * @param {Object} field
 * @param {string} answerText
 * @returns {number|null} the aM number, or null if the value is a stale/
 *                         unrecognized checkbox option and should be skipped.
 */
function resolveAnswerNumber(field, answerText) {
  if (field.type !== 'checkbox') return 1; // radio: always a1

  const optionIndex = field.options.findIndex((o) => o.text === answerText);
  return optionIndex === -1 ? null : optionIndex + 1; // checkbox: aM = option's 1-based index
}

/**
 * Writes every selected answer for one checkbox/radio field into payload
 * as q{questionIndex}a{M} entries. Extracted from buildLegacyAnswersPayload
 * to keep that function's forEach nesting shallow.
 *
 * @param {Map} payload
 * @param {Object} answers
 * @param {Object} field
 * @param {number} questionIndex
 */
function addFieldAnswers(payload, answers, field, questionIndex) {
  const value = getAnswer(answers, field.name);
  const selected = Array.isArray(value) ? value : [value];

  selected.filter(Boolean).forEach((answerText) => {
    const answerNumber = resolveAnswerNumber(field, answerText);
    if (answerNumber === null) return; // guards against a stale/unrecognized value
    payload.set(`q${questionIndex}a${answerNumber}`, answerText);
  });
}

/**
 * Transforms the shared answers store into the flat, legacy q{N}a{M} shape
 * both the PDF and Email APIs expect. Extracted here (rather than living
 * only in the PDF controller) so the two never drift apart
 *
 * @param {Object} answers - the shared answers store from decorate.js
 * @param {Array} steps - the parsed/default steps array (for field order/type)
 * @param {string|null} nameFieldName - field name of the "My name is" input
 * @returns {Object} plain object of legacy keys, e.g. { fname, q1a1, q2a1, ... }
 */
export function buildLegacyAnswersPayload(answers, steps, nameFieldName) {
  // Built as a Map (rather than assigning dynamic keys straight onto a plain
  // object) so property writes below can't be mistaken for prototype-polluting
  // object injection. Converted to a plain object only at the very end.
  const payload = new Map();

  // fname is lowercase in the confirmed live payload (e.g. "rohan").
  const nameValue = nameFieldName ? getAnswer(answers, nameFieldName) : undefined;
  if (nameValue) {
    payload.set('fname', String(nameValue).toLowerCase());
  }

  let questionIndex = 0;
  (steps || []).forEach((step) => {
    step.fields.forEach((field) => {
      if (field.type !== 'checkbox' && field.type !== 'radio') return;
      questionIndex += 1; // qN
      addFieldAnswers(payload, answers, field, questionIndex);
    });
  });

  return Object.fromEntries(payload);
}