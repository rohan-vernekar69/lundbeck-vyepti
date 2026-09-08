// Doctor Discussion — Email Modal content, parsed from the authored
// "email-modal" sheet tab. Unauthored rows stay structurally empty rather
// than falling back to hardcoded copy.

// Name -> setter writing that row's Label onto a known config field.
const SIMPLE_FIELD_SETTERS = new Map([
  ['modal-title', (config, label) => { config.title = label; }],
  ['required-note', (config, label) => { config.requiredNote = label; }],
]);

// Name -> setter writing Label (empty msg) + Placeholder (invalid msg) onto config.errors.
const ERROR_FIELD_SETTERS = new Map([
  ['firstname-error', (errors, label, placeholder) => {
    errors.firstNameEmpty = label;
    if (placeholder) errors.firstNameInvalid = placeholder;
  }],
  ['lastname-error', (errors, label, placeholder) => {
    errors.lastNameEmpty = label;
    if (placeholder) errors.lastNameInvalid = placeholder;
  }],
  ['email-error', (errors, label, placeholder) => {
    errors.emailEmpty = label;
    if (placeholder) errors.emailInvalid = placeholder;
  }],
  ['consent-error', (errors, label) => { errors.consent = label; }],
  ['generic-error', (errors, label) => { errors.generic = label; }],
]);

// Name -> setter writing that row's Label onto the matching field's on-screen Label.
const FIELD_LABEL_SETTERS = new Map([
  ['firstname', (config, label) => { config.firstNameLabel = label; }],
  ['lastname', (config, label) => { config.lastNameLabel = label; }],
  ['email', (config, label) => { config.emailLabel = label; }],
]);

// Structural default config — every field present, all unauthored.
function createEmptyEmailModalConfig() {
  return {
    title: '',
    requiredNote: '',
    firstNameLabel: '',
    lastNameLabel: '',
    emailLabel: '',
    consentParagraphs: [],
    sendLabel: '',
    errors: {
      firstNameEmpty: '',
      firstNameInvalid: '',
      lastNameEmpty: '',
      lastNameInvalid: '',
      emailEmpty: '',
      emailInvalid: '',
      consent: '',
      generic: '',
    },
  };
}

// Parses "email-modal" rows into a config object; unrecognized rows are ignored.
export default function parseEmailModalRows(rows) {
  const config = createEmptyEmailModalConfig();
  const consentParagraphs = [];

  (rows || []).forEach((row) => {
    const type = (row.Type || '').trim().toLowerCase();
    const nameKey = (row.Name || '').trim().toLowerCase();
    const label = (row.Label || '').trim();
    const placeholder = (row.Placeholder || '').trim();
    if (!label) return;

    if (type === 'button' && nameKey === 'send') {
      config.sendLabel = label;
      return;
    }

    if (type === 'text' && FIELD_LABEL_SETTERS.has(nameKey)) {
      FIELD_LABEL_SETTERS.get(nameKey)(config, label);
      return;
    }

    if (type === 'checkbox' && nameKey === 'consent') {
      consentParagraphs.push(label); // 1st consent paragraph
      return;
    }

    if (SIMPLE_FIELD_SETTERS.has(nameKey)) {
      SIMPLE_FIELD_SETTERS.get(nameKey)(config, label);
      return;
    }

    if (ERROR_FIELD_SETTERS.has(nameKey)) {
      ERROR_FIELD_SETTERS.get(nameKey)(config.errors, label, placeholder);
      return;
    }

    if (nameKey.startsWith('consent-paragraph')) {
      consentParagraphs.push(label);
    }
  });

  config.consentParagraphs = consentParagraphs;

  return config;
}