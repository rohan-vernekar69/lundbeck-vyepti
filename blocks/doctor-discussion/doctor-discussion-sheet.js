import parseEmailModalRows from './doctor-discussion-email-config.js';

function hasVisibleText(nodes) {
  return nodes.some((n) => (n.textContent || '').trim());
}

// Reads a rich-text cell into cloned nodes, preserving any authored link.
function parseRichText(valueCell) {
  const source = (valueCell.children.length === 1 && valueCell.children[0].tagName === 'P')
    ? valueCell.children[0].childNodes
    : valueCell.childNodes;
  const cloned = [...source].map((n) => n.cloneNode(true));
  return hasVisibleText(cloned) ? cloned : null;
}

// Reads "Tips List" into one tip per <li>/<p>/newline, as cloned nodes.
function parseTipsList(valueCell) {
  const items = [...valueCell.querySelectorAll('li')];
  if (items.length) {
    return items
      .map((li) => [...li.childNodes].map((n) => n.cloneNode(true)))
      .filter(hasVisibleText);
  }

  const paragraphs = [...valueCell.querySelectorAll('p')];
  if (paragraphs.length) {
    return paragraphs
      .map((p) => [...p.childNodes].map((n) => n.cloneNode(true)))
      .filter(hasVisibleText);
  }

  return valueCell.textContent.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Structural default config — every field present, all unauthored.
function defaultDoctorDiscussionConfig() {
  return {
    sheetUrl: null,
    emailModalSheetUrl: null,
    pdfUrl: null,
    emailUrl: null,
    apiUsername: null,
    apiPassword: null,
    thankYouContent: [],
    ctaHeading: null,
    tipsHeading: null,
    tipsList: null,
    retakeLabel: null,
    retakeIcon: null,
    resultsDownloadDescription: null,
    resultsNote: null,
    downloadButtonLabel: null,
    downloadButtonIcon: null,
    emailButtonLabel: null,
    emailButtonIcon: null,
  };
}

// Hyperlink if present, else plain cell text.
function linkOrText(valueCell, link) {
  return link ? link.href : valueCell.textContent.trim();
}

// Icon URL: image, then link, then plain text, else null.
function resolveIconSrc(valueCell, link, img) {
  if (img) return img.src;
  if (link) return link.href || null;
  return valueCell.textContent.trim() || null;
}

// One (predicate, assign) pair per config row. Order matters — broader
// predicates must come after the more specific ones they'd match.
const CONFIG_ROW_MATCHERS = [
  {
    // Must precede "sheet url" below (both keys contain that substring).
    test: (key) => key.includes('email modal sheet url'),
    assign: (config, { valueCell, link }) => {
      config.emailModalSheetUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('sheet url'),
    assign: (config, { valueCell, link }) => {
      // form.js's createForm() needs this as a plain .json URL.
      config.sheetUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('download pdf'),
    assign: (config, { valueCell, link }) => {
      config.pdfUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('form submission'),
    assign: (config, { valueCell, link }) => {
      config.emailUrl = linkOrText(valueCell, link);
    },
  },
  {
    test: (key) => key.includes('api username'),
    assign: (config, { valueCell }) => { config.apiUsername = valueCell.textContent.trim(); },
  },
  {
    test: (key) => key.includes('api password'),
    assign: (config, { valueCell }) => { config.apiPassword = valueCell.textContent.trim(); },
  },
  {
    // Image first, so classifyThankYouContent() sees it before the message.
    test: (key) => key.includes('upload image'),
    assign: (config, { img }) => { if (img) config.thankYouContent.unshift(img); },
  },
  {
    test: (key) => key.includes('thank you message'),
    assign: (config, { valueCell }) => {
      const nodes = valueCell.children.length ? [...valueCell.children] : [valueCell];
      config.thankYouContent.push(...nodes);
    },
  },
  {
    // Results-screen CTA heading.
    test: (key) => key.includes('retake heading'),
    assign: (config, { valueCell }) => { config.ctaHeading = parseRichText(valueCell); },
  },
  {
    test: (key) => key.includes('tips heading'),
    assign: (config, { valueCell }) => { config.tipsHeading = parseRichText(valueCell); },
  },
  {
    test: (key) => key.includes('tips list'),
    assign: (config, { valueCell }) => { config.tipsList = parseTipsList(valueCell); },
  },
  {
    // Must precede the "download" branches below (also matches "download").
    test: (key) => key.includes('results download description'),
    assign: (config, { valueCell }) => {
      config.resultsDownloadDescription = parseRichText(valueCell);
    },
  },
  {
    // Italic caption below the Download/Email buttons.
    test: (key) => key.includes('results note'),
    assign: (config, { valueCell }) => { config.resultsNote = parseRichText(valueCell); },
  },
  {
    // Needs "label" so it doesn't collide with the "download pdf" row.
    test: (key) => key.includes('download') && key.includes('label'),
    assign: (config, { valueCell }) => { config.downloadButtonLabel = valueCell.textContent.trim(); },
  },
  {
    // Falls back to the existing CSS icon on .dg-download-icon if unauthored.
    test: (key) => key.includes('download') && key.includes('icon'),
    assign: (config, { valueCell, link, img }) => {
      config.downloadButtonIcon = resolveIconSrc(valueCell, link, img);
    },
  },
  {
    // Needs "button"+"label" so it doesn't collide with the sheet/submission URL rows.
    test: (key) => key.includes('email') && key.includes('button') && key.includes('label'),
    assign: (config, { valueCell }) => { config.emailButtonLabel = valueCell.textContent.trim(); },
  },
  {
    // Falls back to the existing CSS icon on .dg-email-icon if unauthored.
    test: (key) => key.includes('email') && key.includes('button') && key.includes('icon'),
    assign: (config, { valueCell, link, img }) => {
      config.emailButtonIcon = resolveIconSrc(valueCell, link, img);
    },
  },
  {
    // Results-screen Retake button text.
    test: (key) => key.includes('retake') && key.includes('label'),
    assign: (config, { valueCell }) => { config.retakeLabel = valueCell.textContent.trim(); },
  },
  {
    // Falls back to the existing CSS icon if unauthored.
    test: (key) => key.includes('retake') && key.includes('icon'),
    assign: (config, { valueCell, link, img }) => {
      config.retakeIcon = resolveIconSrc(valueCell, link, img);
    },
  },
];

function applyConfigRow(config, key, context) {
  const matcher = CONFIG_ROW_MATCHERS.find(({ test }) => test(key));
  if (matcher) matcher.assign(config, context);
}

// Reads the block's authored config rows (endpoints, credentials, Thank
// You content, results-screen copy) into a config object.
export function parseDoctorDiscussionConfig(block) {
  const config = defaultDoctorDiscussionConfig();

  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 2) return;

    const key = cells[0].textContent.trim().toLowerCase();
    const valueCell = cells[1];
    const link = valueCell.querySelector('a');
    const img = valueCell.querySelector('img');

    applyConfigRow(config, key, { valueCell, link, img });
  });

  return config;
}

// Fetches a da.live/AEM sheet JSON and returns one named tab's rows.
async function fetchNamedSheetRows(sheetUrl, sheetName) {
  const res = await fetch(sheetUrl);
  if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
  const json = await res.json();

  const sheetsByName = new Map(Object.entries(json));
  const namedSheet = sheetsByName.get(sheetName);
  if (namedSheet && Array.isArray(namedSheet.data)) return namedSheet.data;

  const sheet = json.data;
  if (Array.isArray(sheet)) return sheet;
  if (sheet && Array.isArray(sheet.data)) return sheet.data;

  return [];
}

// Fetches and parses the Email Modal sheet, or null if unauthored/fails.
export async function fetchEmailModalConfigFromSheet(emailModalSheetUrl) {
  if (!emailModalSheetUrl) return null;
  try {
    const rows = await fetchNamedSheetRows(emailModalSheetUrl, 'email-modal');
    return rows.length ? parseEmailModalRows(rows) : null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Doctor Discussion: failed to load email-modal sheet, falling back to defaults.', error);
    return null;
  }
}