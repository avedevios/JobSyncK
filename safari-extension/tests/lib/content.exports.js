// Test shim: re-exports content.js functions for unit testing.

const ROLE_SELECTORS = [
  '[data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.SemanticJobDetails"] a[href*="/jobs/view/"]',
  'h1.top-card-layout__title',
  'h1[class*="job-title"]',
  '.job-details-jobs-unified-top-card__job-title h1',
  '.job-details-jobs-unified-top-card__job-title',
  '.jobs-unified-top-card__job-title h1',
  '.jobs-unified-top-card__job-title',
  '[class*="job-details-jobs-unified-top-card__job-title"]',
  'h1',
];

const COMPANY_SELECTORS = [
  '[data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.SemanticJobDetails"] [aria-label^="Company,"] p',
  '[data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.SemanticJobDetails"] [aria-label^="Company,"] a',
  '.top-card-layout__card a.topcard__org-name-link',
  '.job-details-jobs-unified-top-card__company-name a',
  '[class*="company-name"] a',
  '.jobs-unified-top-card__company-name a',
  '.jobs-unified-top-card__company-name',
  '.job-details-jobs-unified-top-card__company-name',
  '[class*="company-name"]',
];

function trySelectors(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim() !== '') {
      return el.textContent.trim();
    }
  }
  return '';
}

function parseJobData() {
  const role = trySelectors(ROLE_SELECTORS) || 'Unknown';
  const company = trySelectors(COMPANY_SELECTORS) || 'Unknown';
  const url = window.location.href;
  return { role, company, url };
}

export { parseJobData, trySelectors };
