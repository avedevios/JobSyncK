// Test shim: re-exports background.js functions for unit testing.
// The actual background.js has no exports (loaded as plain script by Safari).

globalThis.chrome = globalThis.chrome || {
  runtime: { onMessage: { addListener: () => {} } },
};

// Inline the source so we can export the functions
const BACKEND_URL = "http://localhost:3333";
const BACKEND_UNAVAILABLE_MSG =
  "Backend unavailable. Make sure the server is running on http://localhost:3333";

function isDuplicateUrl(vacancies, url) {
  return vacancies.some((v) => v.url === url);
}

function buildPayload(data) {
  return {
    role: data.role,
    company: data.company,
    applied_at: new Date().toISOString().split("T")[0],
    applied: false,
    status: "saved",
    url: data.url,
  };
}

async function checkDuplicate(url) {
  try {
    const response = await fetch(`${BACKEND_URL}/vacancies`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Backend error: ${response.status}`);
    const vacancies = await response.json();
    return isDuplicateUrl(vacancies, url);
  } catch {
    return false;
  }
}

async function saveVacancy(data) {
  try {
    const response = await fetch(`${BACKEND_URL}/vacancies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 201) {
      return { success: true, vacancy: await response.json() };
    } else {
      const body = await response.json();
      return { success: false, error: body.error || "Unknown error", status: response.status };
    }
  } catch (error) {
    if (error.name === "TimeoutError" || error.name === "TypeError") {
      return { success: false, error: BACKEND_UNAVAILABLE_MSG };
    }
    return { success: false, error: error.message };
  }
}

export { isDuplicateUrl, buildPayload, checkDuplicate, saveVacancy };
