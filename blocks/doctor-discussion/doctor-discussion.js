import { parseDoctorDiscussionConfig, fetchEmailModalConfigFromSheet } from './doctor-discussion-sheet.js';
import enhanceAsWizard from './doctor-discussion-form-wizard.js';

// EDS entry point
export default async function decorate(block) {
  const config = parseDoctorDiscussionConfig(block);

 // Email Modal copy is authored via a SEPARATE "Email Modal Sheet url" doc.
  config.emailModalConfig = (await fetchEmailModalConfigFromSheet(config.emailModalSheetUrl));

  try {
    const module = await import('../form/form.js');
    if (typeof module.default === 'function') {
      await module.default(block);
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to load form block:', error);
    return;
  }

  const form = block.querySelector('form');
  if (!form) return;

  enhanceAsWizard(block, form, config);
}