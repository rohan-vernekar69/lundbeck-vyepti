import createPdfDownloadController from './doctor-discussion-download-pdf.js';
import {
  createEl, getAnswer, TOTAL_STEPS_DEFAULT, PDF_DOWNLOAD_API_URL,
  PDF_DOWNLOAD_API_USERNAME, PDF_DOWNLOAD_API_PASSWORD,
  PDF_ERROR_ELEMENT_ID, PDF_POPUP_BLOCKED_ELEMENT_ID,
} from './doctor-discussion-utils.js';
import {
  buildHeader, buildTextQuestion, buildCheckboxQuestion, buildRadioQuestion, buildDidYouKnow,
} from './doctor-discussion-field-builders.js';
import {
  buildResultsHeader, buildResultsList, buildResultsActions, buildResultsTips, formatResultsHeading,
} from './doctor-discussion-results-builders.js';
import { DEFAULT_STEPS, parseSteps } from './doctor-discussion-steps.js';
import {
  bindExclusiveCheckboxGroup, bindRadioGroup, updateNextState, collectStepAnswers,
  getOrCreateEmailModal, buildThankYouModal,
} from './doctor-discussion-interactions.js';

// EDS entry point: parses the authored block and renders the multi-step guide into it.
export default function decorate(block) {
  const parsed = parseSteps(block);
  // Fall back to the default step content when nothing is authored in
  // the document. This is decorate()'s call, not parseSteps()'s — it
  // keeps parseSteps a pure parser with no knowledge of DEFAULT_STEPS.
  const steps = parsed.steps.length ? parsed.steps : DEFAULT_STEPS;
  const totalSteps = parsed.steps.length ? parsed.totalSteps : TOTAL_STEPS_DEFAULT;
  // Answers persist across steps (and survive Back navigation) in this single shared object.
  const answers = {};
  let currentIndex = 0;

  // The optional "My name is" text field on step 1 — used to personalize step 2's question on the results screen.
  const nameFieldDef = steps[0]?.fields.find((f) => f.type === 'text');
  const nameFieldName = nameFieldDef ? nameFieldDef.name : null;
  // Flag step 2's first checkbox/radio question so buildResultsList() prefixes it with the entered name.
  const step2NameableField = steps[1]?.fields.find((f) => f.type === 'checkbox' || f.type === 'radio');
  if (nameFieldName && step2NameableField) {
    step2NameableField.personalizeWithName = true;
  }

  // Clear authored content, rebuild as a proper multi-step form.
  block.textContent = '';
  const card = createEl('div', { className: 'dg-card' });
  block.append(card);

  // Forward-declared: renderStep and renderResults call each other, so
  // renderStep needs this before renderResults is assigned below.
  let renderResults;

  // Renders a single step (header, fields, callout, nav buttons) into the card, replacing whatever was there before.
  function renderStep(index) {
    const step = steps[index];
    const stepNumber = index + 1;

    card.textContent = '';
    card.append(buildHeader(stepNumber, totalSteps, step.title));

    let calloutEl = null;
    if (step.didYouKnow) {
      calloutEl = buildDidYouKnow(step.didYouKnow);
    }

    const form = createEl('form', { className: 'dg-form', novalidate: '' });

    step.fields.forEach((fieldDef, i) => {
      const countLabel = i === 0 ? `${stepNumber} of ${totalSteps}` : '';
      if (fieldDef.type === 'text') {
        form.append(buildTextQuestion(fieldDef, countLabel, getAnswer(answers, fieldDef.name), stepNumber));
      } else if (fieldDef.type === 'checkbox') {
        form.append(buildCheckboxQuestion(fieldDef, countLabel, getAnswer(answers, fieldDef.name), stepNumber));
      } else if (fieldDef.type === 'radio') {
        form.append(buildRadioQuestion(fieldDef, countLabel, getAnswer(answers, fieldDef.name), stepNumber));
      }
    });

    // Back button only appears after the first step.
    const actionChildren = [];
    if (index > 0) {
      const backBtn = createEl('button', { type: 'button', className: 'dg-back-btn' },
        createEl('span', { className: 'dg-back-arrow', 'aria-hidden': 'true' }),
        createEl('span', {}, 'Back'),
      );
      backBtn.addEventListener('click', () => {
        collectStepAnswers(form, step, answers);
        currentIndex -= 1;
        renderStep(currentIndex);
        block.dispatchEvent(new CustomEvent('dg:back', { bubbles: true, detail: { stepIndex: currentIndex } }));
      });
      actionChildren.push(backBtn);
    }

    // Final step's submit button reads "Finish" instead of "Next".
    const isLastStep = index === steps.length - 1;
    const nextBtn = createEl('button', { type: 'submit', className: 'dg-next-btn' },
      createEl('span', {}, isLastStep ? 'Finish' : 'Next'),
      createEl('span', { className: 'dg-next-arrow', 'aria-hidden': 'true' }),
    );
    actionChildren.push(nextBtn);

    form.append(createEl('div', { className: 'dg-actions' }, ...actionChildren));

    // Shows the "DID YOU KNOW?" callout only once the user has answered this step's question.
    function updateCalloutVisibility() {
      if (!calloutEl) return;
      const anySelected = step.fields.some((f) => {
        if (f.type !== 'checkbox' && f.type !== 'radio') return false;
        return form.querySelectorAll(`input[name="${f.name}"]:checked`).length > 0;
      });
      calloutEl.hidden = !anySelected;
    }

    bindExclusiveCheckboxGroup(form);
    bindRadioGroup(form);
    updateNextState(form, step);
    updateCalloutVisibility();
    form.addEventListener('change', () => {
      updateNextState(form, step);
      updateCalloutVisibility();
    });
    form.addEventListener('input', () => updateNextState(form, step));

    // Advances to the next step, or shows results if this was the last one.
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (nextBtn.disabled) return;

      collectStepAnswers(form, step, answers);

      if (currentIndex < steps.length - 1) {
        currentIndex += 1;
        renderStep(currentIndex);
        block.dispatchEvent(new CustomEvent('dg:next', {
          bubbles: true,
          detail: { stepIndex: currentIndex, answers },
        }));
      } else {
        block.dispatchEvent(new CustomEvent('dg:complete', { bubbles: true, detail: { answers } }));
        renderResults();
      }
    });

    card.append(form);
    if (calloutEl) {
      card.append(calloutEl);
    }
  }

  // Renders the final results screen: answer summary plus Download/Email/Retake actions.
  renderResults = () => {
    card.textContent = '';
    card.classList.add('dg-results-card');
    card.append(buildResultsHeader());

    const body = createEl('div', { className: 'dg-results-body' });
    body.append(createEl('h2', { className: 'dg-results-title' }, formatResultsHeading(answers, nameFieldName)));
    body.append(buildResultsList(steps, answers, nameFieldName));
    body.append(createEl('p', { className: 'dg-results-download-label' }, 'Download or email doctor discussion guide.'));

    const {
      wrapper: actionsWrapper, downloadBtn, emailBtn,
    } = buildResultsActions();

    const pdfController = createPdfDownloadController({
      apiUrl: PDF_DOWNLOAD_API_URL,
      username: PDF_DOWNLOAD_API_USERNAME,
      password: PDF_DOWNLOAD_API_PASSWORD,
      button: downloadBtn,
      errorElementId: PDF_ERROR_ELEMENT_ID,
      popupBlockedElementId: PDF_POPUP_BLOCKED_ELEMENT_ID,
    });

    // steps + nameFieldName are passed through so the controller can derive
    // the legacy qNaM field names/indices the PDF API expects — see
    // buildLegacyAnswersPayload() in doctor-discussion-utils.js.
    downloadBtn.addEventListener('click', () => pdfController.download(answers, steps, nameFieldName));
    emailBtn.addEventListener('click', () => {
      // steps + nameFieldName are passed through here too, so the email
      // modal can build the same legacy qNaM payload the sendemail API
      // expects — see buildLegacyAnswersPayload() in doctor-discussion-utils.js.
      const emailModal = getOrCreateEmailModal(answers, steps, nameFieldName);
      emailModal.open();
    });
    body.append(actionsWrapper);

    body.append(createEl('p', { className: 'dg-results-note' },
      'Note: if you navigate away from this screen before downloading, you will lose your results.'));

    body.append(createEl('hr', { className: 'dg-results-divider' }));
    body.append(createEl('h3', { className: 'dg-results-cta-heading' }, 'Talk to your doctor and see if VYEPTI might be right for you'));

    // Wipes all stored answers and restarts the guide from Step 1.
    const retakeBtn = createEl('button', { type: 'button', className: 'dg-results-retake-btn' },
      createEl('span', {}, 'Retake'),
      createEl('span', { className: 'dg-retake-icon', 'aria-hidden': 'true' }),
    );
    retakeBtn.addEventListener('click', () => {
      Object.keys(answers).forEach((key) => Reflect.deleteProperty(answers, key));
      currentIndex = 0;
      card.classList.remove('dg-results-card');
      renderStep(currentIndex);
      block.dispatchEvent(new CustomEvent('dg:retake', { bubbles: true }));
    });
    body.append(retakeBtn);

    body.append(createEl('hr', { className: 'dg-results-divider' }));
    body.append(buildResultsTips());

    card.append(body);
  };

  // Kick off the guide at step 1, then wire up the Thank You modal from
  // the authored "thank-you" row's content (parsed above, before the
  // block's original markup was cleared).
  renderStep(currentIndex);
  buildThankYouModal(parsed.thankYouContent);
}