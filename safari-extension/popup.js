// Matches /jobs/view/... and /jobs/search-results/?currentJobId=...
const JOB_PAGE_PATTERN = /^https:\/\/www\.linkedin\.com\/jobs\/(view\/|search-results\/.*[?&]currentJobId=)/;
const DATA_TIMEOUT_MS = 5000;

function isJobPage(url) {
  return JOB_PAGE_PATTERN.test(url);
}

function showState(stateId) {
  document.querySelectorAll('.state').forEach(el => el.classList.add('hidden'));
  const target = document.getElementById(`state-${stateId}`);
  if (target) target.classList.remove('hidden');
}

function fillFields(data) {
  document.getElementById('field-role').textContent = data.role;
  document.getElementById('field-company').textContent = data.company;
  document.getElementById('field-jobtype').textContent = data.jobType || '';
  document.getElementById('field-url').textContent = data.url;
  document.getElementById('field-apply-url').textContent = data.apply_url || 'Not found';
  document.getElementById('field-location').textContent = data.location || 'Unknown';
  document.getElementById('field-posted').textContent = data.posted_at || 'Unknown';
  document.getElementById('field-description').textContent = data.description ? data.description.substring(0, 150) + '...' : 'No description found';
}

function showDuplicateWarning() {
  document.getElementById('duplicate-warning').classList.remove('hidden');
  document.getElementById('btn-save-anyway').classList.remove('hidden');
}

function showSaveResult(type, message) {
  const el = document.getElementById('save-result');
  el.textContent = message;
  el.className = type; // 'success' or 'error'
  el.classList.remove('hidden');
}

function disableSaveButtons() {
  document.getElementById('btn-save').disabled = true;
  document.getElementById('btn-save-anyway').disabled = true;
}

function enableSaveButtons() {
  document.getElementById('btn-save').disabled = false;
  document.getElementById('btn-save-anyway').disabled = false;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), ms)
    ),
  ]);
}

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

function sendMessageToTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}

function sendMessageToBackground(message) {
  return chrome.runtime.sendMessage(message);
}

async function saveJob(data) {
  disableSaveButtons();
  const payload = {
    role: data.role,
    company: data.company,
    applied_at: formatDate(new Date()),
    applied: false,
    status: 'saved',
    url: data.url,
    apply_url: data.apply_url || "",
    job_type: data.jobType || "",
    description: data.description || "",
    posted_at: data.posted_at || "",
  };
  try {
    const result = await sendMessageToBackground({ action: 'saveVacancy', data: payload });
    if (result.success) {
      showSaveResult('success', 'Job saved ✓');
    } else {
      showSaveResult('error', result.error);
      enableSaveButtons();
    }
  } catch (err) {
    showSaveResult('error', err.message);
    enableSaveButtons();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  showState('loading');

  let tab;
  try {
    tab = await getCurrentTab();
  } catch (err) {
    console.error('[JobSaver] Failed to get current tab:', err);
    document.getElementById('data-error-message').textContent =
      'Could not access current tab: ' + err.message;
    showState('data-error');
    return;
  }

  if (!tab || !tab.url) {
    document.getElementById('data-error-message').textContent =
      'Could not read tab URL.';
    showState('data-error');
    return;
  }

  if (!isJobPage(tab.url)) {
    showState('not-job-page');
    return;
  }

  let jobData;
  try {
    jobData = await withTimeout(
      sendMessageToTab(tab.id, { action: 'getJobData' }),
      DATA_TIMEOUT_MS
    );
  } catch (err) {
    console.error('[JobSaver] Failed to get job data:', err);
    document.getElementById('data-error-message').textContent =
      'Could not retrieve page data: ' + err.message;
    showState('data-error');
    return;
  }

  if (!jobData || !jobData.success) {
    document.getElementById('data-error-message').textContent =
      (jobData && jobData.error) || 'Could not retrieve page data';
    showState('data-error');
    return;
  }

  fillFields(jobData.data);

  try {
    const dupResult = await sendMessageToBackground({
      action: 'checkDuplicate',
      url: jobData.data.url,
    });
    if (dupResult && dupResult.isDuplicate) {
      showDuplicateWarning();
    }
  } catch {
    // fail-open: ignore duplicate check errors
  }

  showState('data-ready');

  document.getElementById('btn-save').addEventListener('click', () => saveJob(jobData.data));
  document.getElementById('btn-save-anyway').addEventListener('click', () => saveJob(jobData.data));
});
