// Function for the brightcove script tag integration for the video rendering
export default function getBrightcoveScriptTag(accountId, playerId) {
  const script = document.createElement('script');
  script.src = `https://players.brightcove.net/${accountId}/${playerId}_default/index.min.js`;
  script.async = true;
  document.body.append(script);
}

// Doctor Discussion Guide API Configuration
export const DOCTOR_DISCUSSION_CONFIGS = {
  // Real API endpoint used to generate and download the guide as a PDF.
  PDF_DOWNLOAD_API_URL: 'https://vyepti-stage.d.lundbeckus.com/api/doctordiscussionguide',
  // Real API endpoint used to email the guide to the patient.
  EMAIL_SUBMIT_API_URL: 'https://vyepti-stage.d.lundbeckus.com/api/sendemail',
  // Basic Auth credentials required by the stage API.
  // NOTE: known stage-only credential, intentionally committed here for now.
  // TODO: move Basic Auth to a server-side proxy and drop this from the
  // client bundle entirely (tracked separately) — do not treat this value as
  // a production secret; rotate before promoting to prod, and rotate sooner
  // if this repo is or becomes public, since it's now committed to history.
  PDF_DOWNLOAD_API_USERNAME: 'lundbeck-admin',
  // eslint-disable-next-line sonarjs/no-hardcoded-passwords, secure-coding/no-hardcoded-credentials
  PDF_DOWNLOAD_API_PASSWORD: 'pH6Uuj5k9w8i',
  // Static values the sendemail API expects on every request.
  EMAIL_FORM_TYPE: 'ddg',
  EMAIL_JOBCODE: 'EPT-B-101058',
};