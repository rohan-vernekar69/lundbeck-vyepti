import { buildLegacyAnswersPayload } from './doctor-discussion-utils.js';

/**
 * @param {Object} config - Configuration object.
 * @param {string} config.apiUrl - API endpoint used to generate the PDF.
 * @param {string} [config.username] - Basic Auth username for apiUrl, if required.
 * @param {string} [config.password] - Basic Auth password for apiUrl, if required.
 * @param {HTMLButtonElement} [config.button] - Download button (optional).
 *                                             Used to show loading state and disable multiple clicks.
 * @param {string} [config.errorElementId='pdf-error-msg'] - ID of the generic error message container.
 * @param {string} [config.popupBlockedElementId='dg-pdf-popup-blocked'] - ID of the container shown
 *                 when the browser blocks the auto-opened tab. Must contain an <a> element (or be one)
 *                 that the controller can point at the generated PDF for the user to click manually.
 *
 * @returns {{ download: (quizData: Object, steps: Array, nameFieldName: string|null) => Promise<void> }}
 *          Returns an object exposing the download() function.
 */
export default function createPdfDownloadController({
  apiUrl,
  username,
  password,
  button,
  errorElementId = 'pdf-error-msg',
  popupBlockedElementId = 'dg-pdf-popup-blocked',
} = {}) {
  // Indicates whether a download request is currently in progress. Prevents duplicate API requests if the user clicks multiple times.

  let isLoading = false;

  // Stores the previously created object URL.

  let lastObjectUrl = null;

  /**
   * Builds the request headers, adding a Basic Auth Authorization header
   * when username/password were supplied.
   * @returns {Object}
   */
  function buildHeaders() {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (username && password) {
      const credentials = `${username}:${password}`;
      headers.Authorization = `Basic ${btoa(credentials)}`;
    }
    return headers;
  }

  /**
   * Shows or hides the PDF download error message.
   *
   * @param {boolean} visible - True to show the error, false to hide it.
   */
  function setError(visible) {
    const errorContainer = document.getElementById(errorElementId);

    if (errorContainer) {
      errorContainer.classList.toggle('d-none', !visible);
    }
  }

  /**
   * Shows/hides the popup-blocked fallback UI and points its link at
   * the generated PDF, so a real click can open it (unlike window.open()
   * after an async fetch, which browsers block).
   *
   * @param {boolean} visible
   * @param {string} [url] - Object URL for the generated PDF.
   */
  function setPopupBlocked(visible, url) {
    const container = document.getElementById(popupBlockedElementId);
    if (!container) return;

    container.classList.toggle('d-none', !visible);

    if (visible && url) {
      const link = container.tagName === 'A' ? container : container.querySelector('a');
      if (link) {
        link.href = url;
        link.setAttribute('download', 'doctor-discussion-guide.pdf');
      }
    }
  }

  /**
   * Updates the loading state.
   * - Disables the download button while the request is running.
   * - Adds/removes a CSS loading class.
   * @param {boolean} loading
   */
  function setLoading(loading) {
    isLoading = loading;

    if (button) {
      button.disabled = loading;
      button.classList.toggle('is-loading', loading);
    }
  }

  /**
   * Generates and downloads the PDF.
   * @param {Object} quizData - Quiz/form data (the shared answers store) sent to the PDF API.
   * @param {Array} [steps] - Step/field definitions, needed to derive option indices for the
   *                          legacy qNaM encoding. Falls back to no q/a params if omitted.
   * @param {string|null} [nameFieldName] - Field name of the "My name is" text input, if any.
   */
  async function download(quizData, steps = [], nameFieldName = null) {
    // Ignore repeated clicks while a request is already running.
    if (isLoading) return;

    // Hide any previous error/fallback messages.
    setError(false);
    setPopupBlocked(false);

    // Enable loading state.
    setLoading(true);

    // Open a blank browser tab immediately, synchronously, in direct response to the click.
    const pdfWindow = window.open('', '_blank');

    // If pdfWindow is null here, the popup was blocked.
    const popupWasBlocked = !pdfWindow;

    try {
      // Build the legacy form-encoded payload the PDF API expects, using
      // the shared builder also used by the Email API (see doctor-discussion-utils.js).
      const formPayload = new URLSearchParams(buildLegacyAnswersPayload(quizData, steps, nameFieldName));

      // Send quiz data to the PDF generation API.
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: buildHeaders(),
        body: formPayload.toString(),
      });

      // Ensure the server returned a successful response.

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      // Validate that the response is actually a PDF.

      const contentType = response.headers.get('Content-Type') || '';

      if (!contentType.includes('application/pdf')) {
        throw new Error(`Unexpected content type: ${contentType}`);
      }

      // Convert the response into a Blob.

      const blob = await response.blob();

      // Ensure the PDF is not empty.

      if (!blob || blob.size === 0) {
        throw new Error('Received empty PDF from server');
      }

      // Revoke the previously created object URL (if any) to avoid memory leaks.

      if (lastObjectUrl) {
        URL.revokeObjectURL(lastObjectUrl);
      }

      // Create a temporary browser URL pointing to the PDF blob.

      lastObjectUrl = URL.createObjectURL(blob);

      if (popupWasBlocked) {
        setPopupBlocked(true, lastObjectUrl);
      } else {
        // Navigate the already-opened tab to the generated PDF.
        pdfWindow.location.href = lastObjectUrl;
      }

      const urlToRevoke = lastObjectUrl;
      const revokeDelay = popupWasBlocked ? 5 * 60000 : 60000;

      setTimeout(() => {
        URL.revokeObjectURL(urlToRevoke);
      }, revokeDelay);
    } catch (error) {
      document.dispatchEvent(new CustomEvent('dg:pdf-error', { bubbles: true, detail: { error } }));

      if (pdfWindow) {
        pdfWindow.close();
      }

      setError(true);
    } finally {
      // Always reset the loading state,regardless of success or failure.

      setLoading(false);
    }
  }

  // Public API exposed by this controller.

  return {
    download,
  };
}