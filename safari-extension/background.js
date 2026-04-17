const BACKEND_URL = "http://localhost:3333";
const BACKEND_UNAVAILABLE_MSG =
  "Backend unavailable. Make sure the server is running on http://localhost:3333";

/**
 * Returns true if at least one vacancy in the array has v.url === url.
 * @param {Array<{url: string}>} vacancies
 * @param {string} url
 * @returns {boolean}
 */
function isDuplicateUrl(vacancies, url) {
  return vacancies.some((v) => v.url === url);
}

/**
 * Returns the id of the existing vacancy with matching linkedin_job_id, or null.
 * Falls back to url match if linkedin_job_id is empty.
 * @param {Array<{url: string, linkedin_job_id: string, id: number}>} vacancies
 * @param {string} linkedinJobId
 * @param {string} url
 * @returns {number|null}
 */
function findDuplicateId(vacancies, linkedinJobId, url) {
  if (linkedinJobId) {
    const found = vacancies.find((v) => v.linkedin_job_id === linkedinJobId);
    if (found) return found.id;
  }
  const found = vacancies.find((v) => v.url === url);
  return found ? found.id : null;
}
/**
 * Normalizes description text for similarity comparison.
 * @param {string} text
 * @returns {string}
 */
function normalizeDesc(text) {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "").substring(0, 300);
}

/**
 * Returns similarity ratio between two descriptions (0..1).
 * @param {string} a
 * @param {string} b
 * @returns {number}
 */
function descSimilarity(a, b) {
  const na = normalizeDesc(a);
  const nb = normalizeDesc(b);
  if (!na || !nb) return 0;
  const longer = na.length > nb.length ? na : nb;
  const shorter = na.length > nb.length ? nb : na;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (longer[i] === shorter[i]) matches++;
  }
  return matches / longer.length;
}

/**
 * Finds vacancies with similar descriptions (>= 80% match).
 * @param {Array} vacancies
 * @param {string} description
 * @param {string|null} excludeJobId
 * @returns {Array}
 */
function findSimilarVacancies(vacancies, description, excludeJobId) {
  if (!description) return [];
  return vacancies.filter((v) => {
    if (excludeJobId && v.linkedin_job_id === excludeJobId) return false;
    return v.description && descSimilarity(v.description, description) >= 0.8;
  }).map((v) => ({
    id: v.id,
    role: v.role,
    company: v.company,
    status: v.status,
    url: v.url,
  }));
}

/**
 * Builds a VacancyPayload from parsed job data.
 * @param {{ role: string, company: string, url: string }} data
 * @returns {{ role: string, company: string, applied_at: string, applied: false, status: "saved", url: string }}
 */
function buildPayload(data) {
  return {
    role: data.role,
    company: data.company,
    applied_at: new Date().toISOString().split("T")[0],
    applied: false,
    status: "saved",
    url: data.url,
    linkedin_job_id: data.linkedin_job_id || "",
    apply_url: data.apply_url || "",
    job_type: data.jobType || "",
    location: data.location || "",
    description: data.description || "",
    posted_at: data.posted_at || "",
  };
}

/**
 * Checks whether the given job is already saved in the backend.
 * Returns { isDuplicate, existingId, similarVacancies } — fail-open on error.
 * @param {string} linkedinJobId
 * @param {string} url
 * @param {string} description
 * @returns {Promise<{isDuplicate: boolean, existingId: number|null, similarVacancies: Array}>}
 */
async function checkDuplicate(linkedinJobId, url, description) {
  try {
    const response = await fetch(`${BACKEND_URL}/vacancies`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    const vacancies = await response.json();
    const existingId = findDuplicateId(vacancies, linkedinJobId, url);
    const similarVacancies = findSimilarVacancies(vacancies, description, linkedinJobId);
    return { isDuplicate: existingId !== null, existingId, similarVacancies };
  } catch {
    return { isDuplicate: false, existingId: null, similarVacancies: [] };
  }
}

/**
 * Saves a vacancy to the backend via POST /vacancies.
 * @param {object} data - VacancyPayload
 * @returns {Promise<{success: boolean, vacancy?: object, error?: string, status?: number}>}
 */
async function saveVacancy(data) {
  try {
    const response = await fetch(`${BACKEND_URL}/vacancies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });

    if (response.status === 201) {
      const vacancy = await response.json();
      return { success: true, vacancy };
    } else {
      const body = await response.json();
      return {
        success: false,
        error: body.error || "Unknown error",
        status: response.status,
      };
    }
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "TypeError") {
      return { success: false, error: BACKEND_UNAVAILABLE_MSG };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Updates an existing vacancy via PATCH /vacancies/:id.
 * @param {number} id
 * @param {object} data - VacancyPayload
 * @returns {Promise<{success: boolean, vacancy?: object, error?: string}>}
 */
async function updateVacancy(id, data) {
  try {
    const response = await fetch(`${BACKEND_URL}/vacancies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const vacancy = await response.json();
      return { success: true, vacancy };
    } else {
      const body = await response.json();
      return { success: false, error: body.error || "Unknown error" };
    }
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "TypeError") {
      return { success: false, error: BACKEND_UNAVAILABLE_MSG };
    }
    return { success: false, error: error.message };
  }
}
// Message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "urlChanged") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (tab) updateBadge(tab.id, message.url);
    });
    return false;
  }

  if (message.action === "checkDuplicate") {
    checkDuplicate(message.linkedinJobId, message.url, message.description).then((result) => {
      sendResponse(result);
    });
    return true;
  }

  if (message.action === "saveVacancy") {
    saveVacancy(message.data).then(async (result) => {
      if (result.success) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) updateBadge(tab.id, tab.url);
      }
      sendResponse(result);
    });
    return true;
  }

  if (message.action === "updateVacancy") {
    updateVacancy(message.id, message.data).then(async (result) => {
      if (result.success) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) updateBadge(tab.id, tab.url);
      }
      sendResponse(result);
    });
    return true;
  }
});

// ── Tab badge ──────────────────────────────────────────
const JOB_PAGE_RE = /linkedin\.com\/jobs\/(view\/|search-results\/.*[?&]currentJobId=)|indeed\.com\/(viewjob|jobs|).*[?&](jk|vjk)=/;

function extractJobIdFromUrl(url) {
  try {
    const u = new URL(url);
    const fromParam = u.searchParams.get('currentJobId') || u.searchParams.get('jk') || u.searchParams.get('vjk');
    if (fromParam) return fromParam;
    const match = u.pathname.match(/\/jobs\/view\/(\d+)/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

async function updateBadge(tabId, url) {
  if (!JOB_PAGE_RE.test(url)) {
    chrome.action.setBadgeText({ text: '', tabId });
    return;
  }

  const jobId = extractJobIdFromUrl(url);
  try {
    const response = await fetch(`${BACKEND_URL}/vacancies`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!response.ok) return;
    const vacancies = await response.json();
    const exists = jobId
      ? vacancies.some((v) => v.linkedin_job_id === jobId)
      : vacancies.some((v) => v.url === url);

    if (exists) {
      chrome.action.setBadgeText({ text: '✓', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#059669', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  } catch {
    chrome.action.setBadgeText({ text: '', tabId });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateBadge(tabId, tab.url);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) updateBadge(tabId, tab.url);
});
