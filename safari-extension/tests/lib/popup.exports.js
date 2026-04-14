// Test shim: re-exports popup.js functions for unit testing.

const JOB_PAGE_PATTERN = /^https:\/\/www\.linkedin\.com\/jobs\/(view\/|search-results\/.*[?&]currentJobId=)/;

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
  document.getElementById('field-url').textContent = data.url;
}

function showDuplicateWarning() {
  document.getElementById('duplicate-warning').classList.remove('hidden');
  document.getElementById('btn-save-anyway').classList.remove('hidden');
}

function showSaveResult(type, message) {
  const el = document.getElementById('save-result');
  el.textContent = message;
  el.className = type;
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

export {
  isJobPage, showState, fillFields, showDuplicateWarning, showSaveResult,
  disableSaveButtons, enableSaveButtons, formatDate, withTimeout,
};
