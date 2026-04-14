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
    apply_url: data.apply_url || "",
    job_type: data.jobType || "",
    description: data.description || "",
    posted_at: data.posted_at || "",
  };
}

/**
 * Checks whether the given URL is already saved in the backend.
 * Fail-open: returns false on any error.
 * @param {string} url
 * @returns {Promise<boolean>}
 */
async function checkDuplicate(url) {
  try {
    const response = await fetch(`${BACKEND_URL}/vacancies`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    const vacancies = await response.json();
    return isDuplicateUrl(vacancies, url);
  } catch {
    // fail-open: never block saving due to duplicate check failure
    return false;
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

// Message listener
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === "checkDuplicate") {
    checkDuplicate(message.url).then((isDuplicate) => {
      sendResponse({ isDuplicate });
    });
    return true;
  }

  if (message.action === "saveVacancy") {
    saveVacancy(message.data).then((result) => {
      sendResponse(result);
    });
    return true;
  }
});
