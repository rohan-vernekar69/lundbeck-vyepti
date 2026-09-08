import { lockBodyScroll, unlockBodyScroll } from './doctor-discussion-modal-utils.js';

/**
 * Initializes and manages the Thank You modal.
 *
 * @param {Object} config
 * @param {string} [config.modalId='dg-thankyou-modal']
 * @param {string} [config.openEventName='dg:email-success']
 * @returns {{ open: Function, close: Function }}
 */
export default function createThankYouModalController({
  modalId = 'dg-thankyou-modal',
  openEventName = 'dg:email-success',
} = {}) {
  const modal = document.getElementById(modalId);

  // Forward-declared.
  let handleOutsideClick;
  let handleEscape;

  // Closes modal and unlocks scroll.
  function close() {
    if (!modal) return;
    modal.classList.remove('show');

    unlockBodyScroll();

    document.body.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleEscape);
  }

  // Closes modal if user clicks the backdrop (the .modal wrapper itself)
  handleOutsideClick = (event) => {
    const modalDialog = modal.querySelector('.modal-dialog');
    if (modalDialog && !modalDialog.contains(event.target)) {
      close();
    }
  };

  handleEscape = (event) => {
    if (event.key === 'Escape') close();
  };

  // Opens modal. 
  function open() {
    if (!modal) return;
    modal.classList.add('show');

    lockBodyScroll();

    setTimeout(() => {
      document.body.addEventListener('click', handleOutsideClick);
    }, 0);
    document.addEventListener('keydown', handleEscape);
  }

  // The only way this modal ever opens: a successful email submission.
  document.addEventListener(openEventName, open);
  return { open, close };
}