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
 * Returns a clean share URL for the job.
 * @returns {string}
 */
function getShareUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  const currentJobId = urlParams.get('currentJobId');
  if (currentJobId) {
    return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
  }
  return window.location.origin + window.location.pathname;
}

/**
 * Extracts the LinkedIn job ID from the current URL.
 * @returns {string}
 */
function getLinkedInJobId() {
  const urlParams = new URLSearchParams(window.location.search);
  const fromParam = urlParams.get('currentJobId');
  if (fromParam) return fromParam;
  const match = window.location.pathname.match(/\/jobs\/view\/(\d+)/);
  return match ? match[1] : '';
}

/**
 * Gets the apply URL from the DOM.
 * @returns {string}
 */
function getApplyUrl() {
  const applyLinks = document.querySelectorAll('a[aria-label*="Apply"], a[aria-label*="apply"], a.jobs-apply-button');
  for (const link of applyLinks) {
    if (link.href && link.href.startsWith('http')) {
      // Decode LinkedIn redirect URLs if present
      if (link.href.includes('linkedin.com/safety/go/')) {
        try {
          const urlObj = new URL(link.href);
          const targetUrl = urlObj.searchParams.get('url');
          if (targetUrl) {
            return targetUrl; // URL automatically decoded
          }
        } catch (e) {
          // Fallback to original
        }
      }
      return link.href;
    }
  }

  // Check for Easy Apply button
  const easyApplyBtns = document.querySelectorAll('button[aria-label*="Easy Apply"], button[aria-label*="Easy apply"], button.jobs-apply-button');
  for (const btn of easyApplyBtns) {
    // If it's a button and not a link, it's usually an Easy Apply process that opens a modal
    return 'Easy Apply on LinkedIn';
  }

  return '';
}

/**
 * Gets the job description text from the DOM.
 * @returns {string}
 */
function getJobDescription() {
  const selectors = [
    '#job-details',
    '.jobs-description-content__text',
    '.jobs-description__content',
    'div.job-details-module__content',
    'span[data-testid="expandable-text-box"]',
    'div[data-sdui-component="com.linkedin.sdui.generated.jobseeker.dsl.impl.aboutTheJob"]',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim() !== '') {
      const text = (el.innerText || el.textContent).trim();
      // Strip LinkedIn's "… more" truncation artifact
      return text.replace(/\s*[…\.]{1,3}\s*more\s*$/i, '').trim();
    }
  }
  return '';
}

/**
 * Calculates a standard "YYYY-MM-DD" date from a relative time string.
 * @param {string} amountStr 
 * @param {string} unitStr 
 */
function calculateDateFromRelative(amountStr, unitStr) {
  const amount = parseInt(amountStr, 10);
  const unit = unitStr.toLowerCase();
  const date = new Date();
  
  if (unit === 'minute') date.setMinutes(date.getMinutes() - amount);
  else if (unit === 'hour') date.setHours(date.getHours() - amount);
  else if (unit === 'day') date.setDate(date.getDate() - amount);
  else if (unit === 'week') date.setDate(date.getDate() - (amount * 7));
  else if (unit === 'month') date.setMonth(date.getMonth() - amount);
  
  return date.toISOString().split("T")[0]; // e.g. "2024-05-20"
}

/**
 * Parses the "X hours ago", "Y days ago" from the DOM and outputs actual date.
 * @returns {string}
 */
function getPostedDate() {
  // First, check if there's an exact hidden date span:
  // e.g. <span class="visually-hidden">Posted on April 14, 2026, 9:43 AM</span>
  const spans = document.querySelectorAll('span');
  for (const span of spans) {
    if (span.textContent.includes('Posted on ')) {
      const dateStr = span.textContent.replace('Posted on', '').trim();
      // Date string typically looks like "April 14, 2026, 9:43 AM"
      const parsedDate = new Date(dateStr);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toISOString().split("T")[0]; // YYYY-MM-DD
      }
    }
  }

  // Fallback: search within primary description text for relative dates
  const containers = document.querySelectorAll('div, p, span, strong');
  for (const container of containers) {
    const text = container.textContent.trim();
    const match = text.match(/(?:^|\s)(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i);
    if (match && container.children.length === 0) { // prefer leaf nodes
      return calculateDateFromRelative(match[1], match[2]);
    }
  }
  return '';
}

/**
 * Gets the job location from the DOM.
 * Handles both the search-results right panel and the /jobs/view/ page.
 * @returns {string}
 */
function getJobLocation() {
  // 1. In the right-panel detail view: the location is the first <span> inside
  //    the <p> that also contains "ago" or "people clicked apply".
  //    That <p> sits inside [data-sdui-screen*="SemanticJobDetails"].
  const detailPanel = document.querySelector('[data-sdui-screen*="SemanticJobDetails"]');
  if (detailPanel) {
    const paragraphs = detailPanel.querySelectorAll('p');
    for (const p of paragraphs) {
      const text = p.textContent;
      if (/ago|people clicked/i.test(text)) {
        // First span is the location, e.g. "Winnipeg, MB"
        const firstSpan = p.querySelector('span');
        if (firstSpan) {
          const loc = firstSpan.textContent.trim();
          if (loc && loc.length > 1) return loc;
        }
      }
    }
  }

  // 2. Classic /jobs/view/ page selectors
  const classicSelectors = [
    '.top-card-layout__bullet',
    '.jobs-unified-top-card__bullet',
    '.job-details-jobs-unified-top-card__bullet',
    '[class*="top-card-layout__bullet"]',
    '[class*="unified-top-card__bullet"]',
  ];
  for (const sel of classicSelectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }

  // 3. Fallback: find a <p> whose text looks like "City, Province" or
  //    "City, Province (On-site|Hybrid|Remote)" — short, no newlines
  const allP = document.querySelectorAll('p');
  for (const p of allP) {
    if (p.children.length > 2) continue; // skip complex paragraphs
    const text = p.textContent.trim();
    if (/^[A-Za-zÀ-ÿ\s]+,\s*[A-Z]{2}(\s*\((On-site|Hybrid|Remote)\))?$/.test(text)) {
      return text;
    }
  }

  return '';
}

/**
 * Parses job data from the current page DOM.
 * @returns {{ role: string, company: string, url: string, apply_url: string, jobType: string, location: string, description: string, posted_at: string, linkedin_job_id: string }}
 */
function parseJobData() {
  const role = trySelectors(ROLE_SELECTORS) || 'Unknown';
  const company = trySelectors(COMPANY_SELECTORS) || 'Unknown';
  const jobType = getJobType();
  const url = getShareUrl();
  const linkedin_job_id = getLinkedInJobId();
  const apply_url = getApplyUrl();
  const location = getJobLocation();
  const description = getJobDescription();
  const posted_at = getPostedDate();
  return { role, company, url, linkedin_job_id, apply_url, jobType, location, description, posted_at };
}

// ── Indeed Parser ──────────────────────────────────────

function getIndeedJobId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('jk') || urlParams.get('vjk') ||
    (document.querySelector('[data-jk]') || {}).getAttribute?.('data-jk') || '';
}

function parseIndeedJobData() {
  // Role — use data-testid first (works in both SPA and viewjob),
  // fallback to aria-label on job title link, then JSON data
  let role = 'Unknown';
  const titleEl = document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]');
  if (titleEl) {
    // grab first span text to avoid nested badges
    const span = titleEl.querySelector('span');
    role = (span || titleEl).textContent.trim();
  } else {
    // Try aria-label on job title link: "full details of <Role>"
    const titleLink = document.querySelector('a[aria-label^="full details of"]');
    if (titleLink) {
      role = titleLink.getAttribute('aria-label')
        .replace(/^full details of\s*/i, '')
        .replace(/\s*-\s*job post\s*$/i, '')
        .trim();
    } else {
      // Try JSON embedded in page
      const scripts = document.querySelectorAll('script');
      for (const s of scripts) {
        const m = s.textContent.match(/"title"\s*:\s*"([^"]+)"/);
        if (m) { role = m[1]; break; }
      }
    }
  }

  // Clean up role
  role = role.replace(/\s*-\s*job post\s*$/i, '').trim();

  // Company
  let company = 'Unknown';
  const companyEl = document.querySelector('[data-testid="inlineHeader-companyName"], [data-company-name="true"]');
  if (companyEl) company = companyEl.textContent.trim();

  // Location
  let location = '';
  const locationEl = document.querySelector('[data-testid="job-location"], [data-testid="inlineHeader-companyLocation"]');
  if (locationEl) location = locationEl.textContent.trim();

  // Description
  let description = '';
  const descEl = document.querySelector('#jobDescriptionText, [class*="jobDescriptionText"]');
  if (descEl) description = (descEl.innerText || descEl.textContent).trim();

  // Job type
  let jobType = '';
  const validTypes = ['Full-time', 'Part-time', 'Contract', 'Temporary', 'Permanent', 'Internship'];
  document.querySelectorAll('span, li').forEach(el => {
    const text = el.textContent.trim();
    if (validTypes.some(t => text.toLowerCase() === t.toLowerCase())) jobType = text;
  });

  // Posted date — from JSON data embedded in page
  let posted_at = '';
  const allScripts = document.querySelectorAll('script');
  for (const s of allScripts) {
    const m = s.textContent.match(/"datePublished"\s*:\s*(\d+)/);
    if (m) {
      const ts = parseInt(m[1]);
      if (ts > 1000000000000) { // ms timestamp
        posted_at = new Date(ts).toISOString().split('T')[0];
      } else if (ts > 1000000000) { // s timestamp
        posted_at = new Date(ts * 1000).toISOString().split('T')[0];
      }
      if (posted_at) break;
    }
  }

  // Apply URL — try DOM first, then JSON
  const jk = getIndeedJobId();
  const host = window.location.host;
  const url = jk ? `https://${host}/viewjob?jk=${jk}` : window.location.href;

  let apply_url = url;
  const applyBtn = document.querySelector('[data-indeed-apply-posturl]');
  if (applyBtn) {
    apply_url = applyBtn.getAttribute('data-indeed-apply-posturl') || url;
  } else {
    const extApplyLink = document.querySelector('a[href*="applystart"], a[aria-label*="company site"]');
    if (extApplyLink) {
      apply_url = extApplyLink.href;
    } else {
      for (const s of allScripts) {
        const m = s.textContent.match(/"thirdPartyApplyUrl"\s*:\s*"([^"]+)"/);
        if (m) {
          // Fix escaped unicode slashes (\u002F -> /)
          apply_url = m[1].replace(/\\u002F/gi, '/');
          break;
        }
        const m2 = s.textContent.match(/"applyUrl"\s*:\s*"([^"]+)"/);
        if (m2 && m2[1].startsWith('http')) { apply_url = m2[1]; break; }
      }
    }
  }

  return { role, company, url, indeed_job_id: jk, linkedin_job_id: '', apply_url, jobType, location, description, posted_at, source: 'indeed' };
}

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'getJobData') {
    try {
      // Detect source and parse accordingly
      const isIndeed = /indeed\.com/.test(window.location.hostname);
      const data = isIndeed ? parseIndeedJobData() : parseJobData();
      sendResponse({ success: true, data });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
});

// ── URL change detection (LinkedIn SPA navigation) ─────
let lastTrackedUrl = location.href;

function notifyUrlChange() {
  const current = location.href;
  if (current !== lastTrackedUrl) {
    lastTrackedUrl = current;
    try {
      chrome.runtime.sendMessage({ action: 'urlChanged', url: current });
    } catch (e) {}
  }
}

// Try to intercept history API (may be restricted in Safari)
try {
  const wrap = (method) => {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      notifyUrlChange();
      return result;
    };
  };
  wrap('pushState');
  wrap('replaceState');
} catch (e) {}

// Catch back/forward navigation
window.addEventListener('popstate', notifyUrlChange);

// Fallback: MutationObserver on <title> — LinkedIn updates it on job switch
const titleObserver = new MutationObserver(() => notifyUrlChange());
const titleEl = document.querySelector('title');
if (titleEl) {
  titleObserver.observe(titleEl, { childList: true });
}

// Also poll URL every second as last resort
setInterval(notifyUrlChange, 1000);
