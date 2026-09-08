import {
  createEl, PDF_ERROR_ELEMENT_ID, PDF_POPUP_BLOCKED_ELEMENT_ID,
} from './doctor-discussion-utils.js';
import { renderInlineLinks } from './doctor-discussion-markdown.js';

// Results-screen builders. All copy/labels/icons are authored via da.live —
// unauthored rows degrade gracefully (empty label, omitted icon).

// Build the plain "Results" banner header.
export function buildResultsHeader() {
  return createEl('div', { className: 'dg-header-wrapper dg-results-header-wrapper' },
    createEl('div', { className: 'dg-header dg-results-header' },
      createEl('h2', { className: 'dg-header-title dg-results-header-title' }, 'Results'),
    ),
  );
}

// Shared icon helper for the Download/Email/Retake buttons — omits the
// icon rather than rendering a broken <img> when unauthored.
function buildButtonIcon(className, iconUrl) {
  if (!iconUrl) return null;
  return createEl('img', {
    className, src: iconUrl, alt: '', 'aria-hidden': 'true',
  });
}

// Builds the Download/Email buttons plus hidden error/popup-blocked messages.
export function buildResultsActions(downloadLabel, emailLabel, downloadIconUrl, emailIconUrl) {
  const downloadBtn = createEl('button', { type: 'button', className: 'dg-results-download-btn' },
    createEl('span', {}, downloadLabel),
    buildButtonIcon('dg-download-icon', downloadIconUrl),
  );
  const emailBtn = createEl('button', { type: 'button', className: 'dg-results-email-btn' },
    createEl('span', {}, emailLabel),
    buildButtonIcon('dg-email-icon', emailIconUrl),
  );
  const pdfErrorMsg = createEl('p', {
    id: PDF_ERROR_ELEMENT_ID,
    className: 'dg-pdf-error-msg d-none',
    role: 'alert',
  }, 'Something went wrong generating your PDF. Please try again.');

  // Shown if the browser blocks the auto-opened PDF tab.
  const popupBlockedLink = createEl('a', {
    href: '#',
    className: 'dg-pdf-popup-blocked-link',
  }, 'Your PDF is ready — tap here to open it');
  const popupBlockedMsg = createEl('div', {
    id: PDF_POPUP_BLOCKED_ELEMENT_ID,
    className: 'dg-pdf-popup-blocked d-none',
    role: 'status',
  },
    createEl('p', { className: 'dg-pdf-popup-blocked-text' },
      "Your browser blocked the automatic download. Your PDF is ready — use the link below to open it:"),
    popupBlockedLink,
  );

  const wrapper = createEl('div', { className: 'dg-results-actions' },
    downloadBtn, emailBtn, pdfErrorMsg, popupBlockedMsg);
  return {
    wrapper, downloadBtn, emailBtn, pdfErrorMsg, popupBlockedMsg,
  };
}

// Renders authored content (nodes or a markdown string) into DOM nodes,
// styling any link with target/rel + an optional class.
export function renderRichContent(content, linkClassName) {
  if (Array.isArray(content)) {
    content.forEach((node) => {
      if (node instanceof HTMLElement && node.tagName.toLowerCase() === 'a') {
        if (linkClassName) node.classList.add(linkClassName);
        node.target = '_blank';
        node.rel = 'noopener noreferrer';
      }
    });
    return content;
  }
  return renderInlineLinks(content, linkClassName);
}

// Retake button's icon, via the shared buildButtonIcon() helper.
export function buildRetakeIcon(iconUrl) {
  return buildButtonIcon('dg-retake-icon', iconUrl);
}

// Builds the Retake button. Caller wires the click.
export function buildRetakeButton(label, iconUrl) {
  return createEl('button', { type: 'button', className: 'dg-results-retake-btn' },
    createEl('span', {}, label),
    buildRetakeIcon(iconUrl));
}

// Builds the closing tips callout; each tip rendered via renderRichContent().
export function buildResultsTips(tipsHeading, tips) {
  return createEl('div', { className: 'dg-results-tips' },
    createEl('p', { className: 'dg-results-tips-heading' },
      ...renderRichContent(tipsHeading, 'dg-results-vyepti-link')),
    createEl('ul', { className: 'dg-results-tips-list' },
      ...(tips || []).map((tip) => createEl(
        'li',
        {},
        ...renderRichContent(tip, 'dg-results-vyepti-link'),
      )),
    ),
  );
}