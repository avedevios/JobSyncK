// Content Script: parses LinkedIn job page DOM

const ROLE_SELECTORS = [
  // Stable: job title link in the right panel (search results)
  '[data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.SemanticJobDetails"] a[href*="/jobs/view/"]',
  // Stable: job title heading in /jobs/view/ page
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
  // Stable: company link in the right panel (search results)
  '[data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.SemanticJobDetails"] [aria-label^="Company,"] p',
  '[data-sdui-screen="com.linkedin.sdui.flagshipnav.jobs.SemanticJobDetails"] [aria-label^="Company,"] a',
  // /jobs/view/ page
  '.top-card-layout__card a.topcard__org-name-link',
  '.job-details-jobs-unified-top-card__company-name a',
  '[class*="company-name"] a',
  // /jobs/search-results/ page (right panel)
  '.jobs-unified-top-card__company-name a',
  '.jobs-unified-top-card__company-name',
  '.job-details-jobs-unified-top-card__company-name',
  '[class*="company-name"]',
];

/**
 * Iterates over CSS selectors and returns the trimmed textContent of the
 * first matching non-empty element. Returns "" if none found.
 * @param {string[]} selectors
 * @returns {string}
 */
function trySelectors(selectors) {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el && el.textContent.trim() !== '') {
      return el.textContent.trim();
    }
  }
  return '';
}

/**
 * Gets the job type based on common keywords found in spans and list items.
 * @returns {string}
 */
function getJobType() {
  const elements = document.querySelectorAll('span, li');
  const validTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Volunteer', 'Internship', 'On-site', 'Hybrid', 'Remote'];
  for (const el of elements) {
    const text = el.textContent.trim();
    if (validTypes.includes(text)) {
      return text;
    }
  }
  return '';
}

/**
 * Parses job data from the current page DOM.
 * @returns {{ role: string, company: string, url: string, jobType: string }}
 */
function parseJobData() {
  const role = trySelectors(ROLE_SELECTORS) || 'Unknown';
  const company = trySelectors(COMPANY_SELECTORS) || 'Unknown';
  const jobType = getJobType();
  const url = window.location.href;
  return { role, company, url, jobType };
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getJobData') {
    try {
      const data = parseJobData();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});
