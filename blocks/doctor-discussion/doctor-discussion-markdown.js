// Doctor Discussion — parses the "[tag](value)" markdown authors use in
// sheet text (Label, Options, callouts).

// Matches an authored "[icon](url)" tag.
const ICON_MARKDOWN_PATTERN = /\[icon\]\(([^)]+)\)/i;

// Extracts an authored "[icon](url)" tag from a raw option/label string.
export function extractIconMarkdown(rawText) {
  const text = rawText || '';
  const match = ICON_MARKDOWN_PATTERN.exec(text);
  if (!match) return { icon: null, text: text.trim() };
  return { icon: match[1], text: text.replace(ICON_MARKDOWN_PATTERN, '').trim() };
}

// Matches all authored "[label](url)" links (global, unlike the icon tag above).
const LINK_MARKDOWN_PATTERN = /\[([^[\]]+)]\(([^()]+)\)/g;

// Splits text on "[label](url)" links into text nodes + <a> elements.
export function renderInlineLinks(rawText, linkClassName = '') {
  const text = rawText || '';
  const nodes = [];
  let lastIndex = 0;
  let match = LINK_MARKDOWN_PATTERN.exec(text);

  while (match !== null) {
    const [fullMatch, label, url] = match;

    if (match.index > lastIndex) {
      nodes.push(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    if (linkClassName) anchor.className = linkClassName;
    anchor.textContent = label;
    nodes.push(anchor);
    lastIndex = match.index + fullMatch.length;
    match = LINK_MARKDOWN_PATTERN.exec(text);
  }

  if (lastIndex < text.length) {
    nodes.push(document.createTextNode(text.slice(lastIndex)));
  }

  return nodes.length ? nodes : [document.createTextNode(text)];
}