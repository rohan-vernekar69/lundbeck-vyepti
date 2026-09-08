import {
  createEl, PDF_DOWNLOAD_API_URL, capitalizeName,
} from './doctor-discussion-utils.js';
import { extractIconMarkdown } from './doctor-discussion-markdown.js';
import {
  buildResultsHeader, buildResultsActions, buildResultsTips, renderRichContent, buildRetakeButton,
} from './doctor-discussion-results-builders.js';
import { getOrCreateEmailModal, buildThankYouModal } from './doctor-discussion-interactions.js';

// Classifies + splits form.js's raw flat output into per-step chunks.
function classifyRaw(el) {
  if (el.classList.contains('heading-wrapper')) return 'heading';
  if (el.classList.contains('text-wrapper')) return 'text';
  if (el.classList.contains('button-wrapper')) return 'button';
  if (el.classList.contains('selection-wrapper')) return 'selection';
  if (el.classList.contains('plaintext-wrapper')) {
    return /^did you know/i.test(el.textContent.trim()) ? 'callout' : 'plaintext';
  }
  return 'other';
}

function splitRawSteps(form) {
  const steps = [];
  [...form.children].forEach((el) => {
    if (classifyRaw(el) === 'heading' || !steps.length) steps.push([]);
    steps[steps.length - 1].push(el);
  });
  return steps;
}

// Rebuilders: raw form.js field-wrapper -> polished dg-* markup. Inputs/
// labels are moved (not cloned) so id/name/checked + form.elements survive.

function buildHeaderWrapper(rawHeading, stepNumber, totalSteps) {
  const h2 = rawHeading.querySelector('h2, h3') || createEl('h2', {}, '');
  const header = createEl('div', { className: 'dg-header' },
    createEl('span', { className: 'dg-header-badge' }, String(stepNumber)),
    h2);
  const progress = createEl('div', { className: 'dg-progress' });
  for (let i = 0; i < totalSteps; i += 1) {
    const seg = createEl('span', { className: 'dg-progress-segment' });
    if (i < stepNumber) seg.classList.add('is-complete');
    progress.append(seg);
  }
  return createEl('div', { className: 'dg-header-wrapper' }, header, progress);
}

function buildTextField(rawText, countLabel, stepNumber) {
  const input = rawText.querySelector('input');
  const label = rawText.querySelector('label');
  input.classList.add('dg-text-input');
  label.classList.add('dg-field-label');

  const labelRow = createEl('div', { className: 'dg-field-label-row' }, label);
  if (countLabel) labelRow.append(createEl('span', { className: 'dg-field-count' }, countLabel));

  const field = createEl('div', { className: `dg-field dg-field-step${stepNumber} dg-field-text` }, labelRow);
  // Placeholder doubles as the helper caption, then gets cleared.
  if (input.placeholder) {
    field.append(createEl('p', { className: 'dg-field-helper' }, input.placeholder));
    input.removeAttribute('placeholder');
  }
  field.append(input);
  return field;
}

// Option icon: an authored "[icon](url)" tag renders as <img>.
function buildOptionIconEl(icon, showIcon, index) {
  if (icon) {
    return createEl('img', { className: 'dg-option-icon', src: icon, alt: '' });
  }
  if (showIcon) {
    return createEl('span', { className: `dg-option-icon dg-step1-icon${index + 1}`, 'aria-hidden': 'true' });
  }
  return null;
}

function buildOptionLabel(rawSelection, index, showIcon) {
  const input = rawSelection.querySelector('input');
  const rawLabel = rawSelection.querySelector('label');
  const rawLabelText = rawLabel.textContent.trim();
  const { icon, text } = extractIconMarkdown(rawLabelText);
  input.classList.add('dg-option-input');
  if (/none of the above/i.test(text)) input.dataset.exclusive = 'true';

  // Syncs an un-authored radio's value to the cleaned text (checkboxes
  // default to "checked" instead, so this never fires for them).
  if (input.value === rawLabelText) {
    input.value = text;
  }

  const optionLabel = createEl('label', { className: 'dg-option', for: input.id });
  const iconEl = buildOptionIconEl(icon, showIcon, index);
  if (iconEl) optionLabel.append(iconEl);
  optionLabel.append(
    createEl('span', { className: 'dg-option-text' }, text),
    input,
    createEl('span', { className: 'dg-option-control' }),
  );
  return optionLabel;
}

// Merges the preceding plaintext rows (label, description) with the
// option rows themselves into one dg-field.
function buildOptionGroupField(plaintexts, selectionRaws, countLabel, stepNumber) {
  const isCheckbox = selectionRaws.some((raw) => raw.querySelector('input[type="checkbox"]'));
  const field = createEl('div', { className: `dg-field dg-field-step${stepNumber} dg-field-checkbox${isCheckbox ? '' : ' dg-field-radio'}` });

  const [labelText, descText] = plaintexts.map((el) => el.textContent.trim());
  if (labelText) field.append(createEl('h3', { className: 'dg-field-label' }, labelText));

  const helperRow = createEl('div', { className: 'dg-field-helper-row' },
    createEl('span', { className: 'dg-field-helper' }, isCheckbox ? 'Select all that apply' : 'Select one'));
  if (countLabel) helperRow.append(createEl('span', { className: 'dg-field-count' }, countLabel));
  field.append(helperRow);

  if (descText) field.append(createEl('p', { className: 'dg-field-description' }, descText));

  const optionList = createEl('div', { className: `dg-option-list${isCheckbox ? '' : ' dg-option-list--radio'}` });
  const showIcon = stepNumber === 1;
  selectionRaws.forEach((raw, index) => optionList.append(buildOptionLabel(raw, index, showIcon)));
  field.append(optionList);

  return { field, isCheckbox, inputs: [...optionList.querySelectorAll('input')] };
}

const DEFAULT_BACK_LABEL = 'Back';
const DEFAULT_NEXT_LABEL = 'Next';
const DEFAULT_FINISH_LABEL = 'Finish';

// Back/Next/Finish icon: authored URL renders as <img>.
function buildActionIcon(fallbackClassName, iconUrl = null) {
  if (iconUrl) {
    return createEl('img', {
      className: fallbackClassName, src: iconUrl, alt: '', 'aria-hidden': 'true',
    });
  }
  return createEl('span', { className: fallbackClassName, 'aria-hidden': 'true' });
}

// Button icon: dedicated Placeholder-column URL, else a "[icon](url)" tag
// in the Label text.
function resolveActionIcon(explicitIconUrl, labelIcon) {
  return explicitIconUrl || labelIcon || null;
}

// backLabelRaw/nextLabelRaw: raw authored button-row <label> text (may
// embed "[icon](url)"); backIconRaw/nextIconRaw: authored Placeholder icon URLs.
function buildActions(hasBack, isLastStep, backLabelRaw, nextLabelRaw, backIconRaw, nextIconRaw) {
  const children = [];
  let backBtn = null;

  if (hasBack) {
    const { icon: backLabelIcon, text: backText } = extractIconMarkdown(backLabelRaw || '');
    const backIcon = resolveActionIcon(backIconRaw, backLabelIcon);
    backBtn = createEl('button', { type: 'button', className: 'dg-back-btn' },
      buildActionIcon('dg-back-arrow', backIcon),
      createEl('span', {}, backText || DEFAULT_BACK_LABEL));
    children.push(backBtn);
  }

  const { icon: nextLabelIcon, text: nextText } = extractIconMarkdown(nextLabelRaw || '');
  const nextIcon = resolveActionIcon(nextIconRaw, nextLabelIcon);
  const fallbackNextLabel = isLastStep ? DEFAULT_FINISH_LABEL : DEFAULT_NEXT_LABEL;
  const nextBtn = createEl('button', { type: 'button', className: 'dg-next-btn' },
    createEl('span', {}, nextText || fallbackNextLabel),
    buildActionIcon('dg-next-arrow', nextIcon));
  children.push(nextBtn);

  return { actions: createEl('div', { className: 'dg-actions' }, ...children), backBtn, nextBtn };
}

function buildCallout(rawCallout) {
  const text = rawCallout.textContent.trim();
  const match = /^(did you know\??)(.*)$/is.exec(text);
  const heading = match ? match[1] : 'DID YOU KNOW?';
  const body = match ? match[2].trim() : text;
  return createEl('div', { className: 'dg-callout', hidden: '' },
    createEl('div', { className: 'dg-callout-wrapper' },
      createEl('span', { className: 'dg-callout-icon', 'aria-hidden': 'true' }),
      createEl('p', { className: 'dg-callout-text' },
        createEl('strong', { className: 'dg-callout-heading' }, `${heading} `),
        body)));
}

// Rebuilds one step's raw elements into { stepEl, optionFields, backBtn, nextBtn, calloutEl, hasTextField }.
function buildStep(rawEls, stepNumber, totalSteps, isLastStep) {
  const formEl = createEl('div', { className: 'dg-form' });
  const optionFields = [];
  let headerWrapper = null;
  let calloutEl = null;
  let hasBack = false;
  // Raw label text + icon URL for this step's Back/Next button rows.
  let backLabelRaw = null;
  let nextLabelRaw = null;
  let backIconRaw = null;
  let nextIconRaw = null;
  let hasTextField = false;
  let pendingPlaintexts = [];
  let pendingSelection = [];
  let fieldCount = 0;

  function nextCountLabel() {
    const label = fieldCount === 0 ? `${stepNumber} of ${totalSteps}` : '';
    fieldCount += 1;
    return label;
  }

  function flushSelection() {
    if (!pendingSelection.length) return;
    const result = buildOptionGroupField(pendingPlaintexts, pendingSelection, nextCountLabel(), stepNumber);
    formEl.append(result.field);
    optionFields.push(result);
    pendingPlaintexts = [];
    pendingSelection = [];
  }

  rawEls.forEach((raw) => {
    const kind = classifyRaw(raw);
    if (kind === 'heading') {
      headerWrapper = buildHeaderWrapper(raw, stepNumber, totalSteps);
    } else if (kind === 'text') {
      flushSelection();
      hasTextField = true;
      formEl.append(buildTextField(raw, nextCountLabel(), stepNumber));
    } else if (kind === 'plaintext') {
      pendingPlaintexts.push(raw);
    } else if (kind === 'selection') {
      pendingSelection.push(raw);
    } else if (kind === 'callout') {
      flushSelection();
      calloutEl = buildCallout(raw);
    } else if (kind === 'button') {
      flushSelection();
      // Placeholder doubles as the icon URL (unused otherwise on buttons).
      const labelText = raw.querySelector('label')?.textContent?.trim() || '';
      const iconUrl = raw.querySelector('input')?.getAttribute('placeholder')?.trim() || null;
      if (/back/i.test(labelText)) {
        hasBack = true;
        backLabelRaw = labelText;
        backIconRaw = iconUrl;
      } else if (labelText) {
        nextLabelRaw = labelText;
        nextIconRaw = iconUrl;
      }
    }
  });
  flushSelection();

  const {
    actions, backBtn, nextBtn,
  } = buildActions(hasBack, isLastStep, backLabelRaw, nextLabelRaw, backIconRaw, nextIconRaw);
  formEl.append(actions);

  const stepEl = createEl('div', { className: 'dg-step' });
  if (headerWrapper) stepEl.append(headerWrapper);
  stepEl.append(formEl);
  if (calloutEl) stepEl.append(calloutEl);

  return {
    stepEl, optionFields, backBtn, nextBtn, calloutEl, hasTextField,
  };
}

// Behavior form-fields.js doesn't implement: exclusive selection, the
// "DID YOU KNOW" reveal, disabled-until-answered Next/Finish, and
// personalizing a results question with the entered name.

function allOptionInputs(step) {
  return step.optionFields.flatMap((f) => f.inputs);
}

function optionLabelFor(input) {
  return input.closest('.dg-option')?.querySelector('.dg-option-text')?.textContent || '';
}

// Radio fields are single-select regardless of `name`; checkbox fields
// only enforce exclusivity with the "None of the above" option.
function uncheckConflictingInputs(inputs, input, isCheckbox) {
  inputs.forEach((other) => {
    if (other === input) return;
    if (!isCheckbox || input.dataset.exclusive === 'true' || other.dataset.exclusive === 'true') {
      other.checked = false;
    }
  });
}

function handleSelectionChange(input, inputs, isCheckbox) {
  if (!input.checked) return;
  uncheckConflictingInputs(inputs, input, isCheckbox);
}

function wireSelectionBehavior(step) {
  step.optionFields.forEach(({ inputs, isCheckbox }) => {
    inputs.forEach((input) => {
      input.addEventListener('change', () => handleSelectionChange(input, inputs, isCheckbox));
    });
  });
}

function wireCallout(step) {
  if (!step.calloutEl) return;
  const inputs = allOptionInputs(step);
  const update = () => { step.calloutEl.hidden = !inputs.some((i) => i.checked); };
  inputs.forEach((i) => i.addEventListener('change', update));
}

function hasAnswer(step) {
  const inputs = allOptionInputs(step);
  return !inputs.length || inputs.some((i) => i.checked);
}

// A step is valid once every option group has a selection (text-only
// steps with no groups never block progress).
function isStepValid(step) {
  return step.optionFields.every(({ inputs }) => !inputs.length || inputs.some((i) => i.checked));
}

// Keeps Next/Finish disabled until isStepValid() — mirrors updateNextState()'s
// rule for the other (now-removed) rendering path.
function wireNextButtonState(step) {
  const update = () => {
    const valid = isStepValid(step);
    step.nextBtn.disabled = !valid;
    step.nextBtn.classList.toggle('is-disabled', !valid);
  };
  allOptionInputs(step).forEach((input) => input.addEventListener('change', update));
  update(); // set the correct initial (usually disabled) state
}

// Results screen

function fieldPayloadValue(field) {
  if (field.type === 'checkbox' || field.type === 'radio') {
    if (!field.checked) return undefined;
    // Prefers the cleaned display text over the raw "[icon](url)" value.
    return optionLabelFor(field) || field.value;
  }
  return field.value;
}

function collectAnswers(form) {
  const nameInput = form.querySelector('input[type="text"]');

  // Built via Object.fromEntries so no key comes from dynamic bracket-assignment.
  const entries = [...form.elements]
    .filter((field) => field.name && !field.disabled && field.type !== 'submit' && field.type !== 'button')
    .map((field) => [field.name, fieldPayloadValue(field)])
    .filter(([, value]) => value !== undefined);
  const payload = Object.fromEntries(entries);

  if (nameInput && nameInput.value.trim()) {
    // Title-cased before sending — the backend renders it verbatim.
    payload.fname = capitalizeName(nameInput.value.trim());
  }

  return payload;
}

function questionTextForStep(step) {
  const label = step.stepEl.querySelector('.dg-field-checkbox .dg-field-label, .dg-field-radio .dg-field-label');
  const heading = step.stepEl.querySelector('.dg-header h2, .dg-header h3');
  return (label || heading)?.textContent.trim() || '';
}

// Index of the "My name is" text step, so the following step's question
// can be personalized on the results screen.
function findNameStepIndex(steps) {
  return steps.findIndex((step) => step.hasTextField);
}

// Builds the numbered "question / Your Answer" list; personalizes the
// question right after the name step.
function buildResultsList(steps, name) {
  const list = createEl('ol', { className: 'dg-results-list' });
  const nameStepIndex = findNameStepIndex(steps);
  const personalizeIndex = nameStepIndex === -1 ? -1 : nameStepIndex + 1;

  steps.forEach((step, index) => {
    const checked = allOptionInputs(step).filter((i) => i.checked);
    if (!checked.length) return;
    const answerText = checked.map(optionLabelFor).join(', ');
    const baseQuestion = questionTextForStep(step);
    const questionText = (name && index === personalizeIndex)
      ? `${name}... ${baseQuestion}`
      : baseQuestion;
    list.append(createEl('li', { className: 'dg-results-item' },
      createEl('p', { className: 'dg-results-question' }, questionText),
      createEl('p', { className: 'dg-results-answer' },
        createEl('span', { className: 'dg-results-answer-label' }, 'Your Answer: '),
        createEl('span', { className: 'dg-results-answer-value' }, answerText || '—'))));
  });
  return list;
}

// Returns the visitor-entered name, title-cased.
function findNameValue(form) {
  return capitalizeName(form.querySelector('input[type="text"]')?.value || '');
}

// Downloads the PDF; no Authorization header if apiUsername/apiPassword are missing.
async function downloadPdf(answers, pdfUrl, apiUsername, apiPassword, button) {
  button.disabled = true;
  const pdfWindow = window.open('', '_blank');
  try {
    const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    if (apiUsername && apiPassword) {
      const credentials = `${apiUsername}:${apiPassword}`;
      headers.Authorization = `Basic ${btoa(credentials)}`;
    }
    const res = await fetch(pdfUrl, { method: 'POST', headers, body: new URLSearchParams(answers).toString() });
    if (!res.ok) throw new Error(`PDF request failed: ${res.status}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (pdfWindow) pdfWindow.location.href = url; else window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Doctor Discussion: PDF download failed.', error);
    if (pdfWindow) pdfWindow.close();
  } finally {
    button.disabled = false;
  }
}

function showResults(card, form, steps, config, showStep) {
  form.classList.add('d-none');
  const answers = collectAnswers(form);
  const name = findNameValue(form);

  const resultsCard = createEl('div', { className: 'dg-card dg-results-card' });
  resultsCard.append(buildResultsHeader());

  const body = createEl('div', { className: 'dg-results-body' });
  body.append(createEl('h2', { className: 'dg-results-title' },
    name ? `${name}'s personalized migraine discussion guide` : 'My personalized migraine discussion guide'));
  body.append(buildResultsList(steps, name));

  // "Download or email..." copy, authored via da.live.
  body.append(createEl('p', { className: 'dg-results-download-label' },
    ...renderRichContent(config.resultsDownloadDescription, null)));

  // Download/Email buttons — labels + icons authored via da.live.
  const { wrapper: actionsWrapper, downloadBtn, emailBtn } = buildResultsActions(
    config.downloadButtonLabel,
    config.emailButtonLabel,
    config.downloadButtonIcon,
    config.emailButtonIcon,
  );
  downloadBtn.addEventListener('click', () => downloadPdf(
    answers,
    config.pdfUrl || PDF_DOWNLOAD_API_URL,
    config.apiUsername,
    config.apiPassword,
    downloadBtn,
  ));
  emailBtn.addEventListener('click', () => {
    const emailModal = getOrCreateEmailModal(
      answers,
      config.emailUrl,
      config.apiUsername,
      config.apiPassword,
      config.emailModalConfig,
    );
    emailModal.open();
  });
  body.append(actionsWrapper);

  // Italic "Note: if you navigate away..." caption, authored via da.live.
  body.append(createEl('p', { className: 'dg-results-note' },
    ...renderRichContent(config.resultsNote, null)));
  body.append(createEl('hr', { className: 'dg-results-divider' }));

  // "Talk to your doctor..." heading, authored via da.live.
  body.append(createEl('h3', { className: 'dg-results-cta-heading' },
    ...renderRichContent(config.ctaHeading, 'dg-results-vyepti-link')));

  const retakeBtn = buildRetakeButton(config.retakeLabel, config.retakeIcon);
  retakeBtn.addEventListener('click', () => {
    form.reset();
    resultsCard.remove();
    form.classList.remove('d-none');
    // Jump to step 0 explicitly so Retake restarts the wizard.
    showStep(0);
    form.dispatchEvent(new CustomEvent('dg:retake', { bubbles: true }));
  });
  body.append(retakeBtn);

  body.append(createEl('hr', { className: 'dg-results-divider' }));

  // Closing tips callout, authored via da.live.
  body.append(buildResultsTips(config.tipsHeading, config.tipsList));

  resultsCard.append(body);
  card.append(resultsCard);
}

// Entry point

// Rebuilds form.js's flat output into the polished step wizard, without
// modifying form.js/form-fields.js themselves.
export default function enhanceAsWizard(block, form, config) {
  form.setAttribute('novalidate', '');
  form.addEventListener('submit', (e) => e.preventDefault());

  const rawSteps = splitRawSteps(form);
  const totalSteps = rawSteps.length;
  const steps = rawSteps.map((raw, i) => buildStep(raw, i + 1, totalSteps, i === totalSteps - 1));

  form.textContent = '';
  const card = createEl('div', { className: 'dg-card' });
  form.before(card);
  card.append(form);
  steps.forEach((step) => form.append(step.stepEl));

  steps.forEach((step) => {
    wireSelectionBehavior(step);
    wireCallout(step);
    wireNextButtonState(step);
  });

  function showStep(index) {
    steps.forEach((step, i) => {
      step.stepEl.classList.toggle('is-active', i === index);
    });
  }

  steps.forEach((step, index) => {
    if (step.backBtn) step.backBtn.addEventListener('click', () => showStep(index - 1));
    step.nextBtn.addEventListener('click', () => {
      if (!hasAnswer(step)) return;
      if (index < steps.length - 1) showStep(index + 1);
      else showResults(card, form, steps, config, showStep);
    });
  });

  showStep(0);
  buildThankYouModal(config.thankYouContent);
}