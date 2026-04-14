import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isJobPage,
  showState,
  fillFields,
  showDuplicateWarning,
  showSaveResult,
  formatDate,
  withTimeout,
} from '../lib/popup.exports.js';

const POPUP_HTML = `
  <div id="state-loading" class="state">
    <div class="spinner"></div>
    <p>Loading...</p>
  </div>
  <div id="state-not-job-page" class="state hidden">
    <p class="info">Open a LinkedIn job listing to save it.</p>
  </div>
  <div id="state-data-error" class="state hidden">
    <p id="data-error-message" class="error"></p>
  </div>
  <div id="state-data-ready" class="state hidden">
    <div class="field">
      <label>Role</label>
      <span id="field-role"></span>
    </div>
    <div class="field">
      <label>Company</label>
      <span id="field-company"></span>
    </div>
    <div class="field">
      <label>URL</label>
      <span id="field-url" class="url-truncated"></span>
    </div>
    <div id="duplicate-warning" class="warning hidden">
      ⚠️ This job is already saved.
    </div>
    <button id="btn-save" class="btn-primary">Save Job</button>
    <button id="btn-save-anyway" class="btn-secondary hidden">Save Again</button>
    <p id="save-result" class="hidden"></p>
  </div>
`;

beforeEach(() => {
  document.body.innerHTML = POPUP_HTML;

  globalThis.chrome = {
    tabs: {
      query: vi.fn(),
      sendMessage: vi.fn(),
    },
    runtime: {
      sendMessage: vi.fn(),
    },
  };
});

describe('showState', () => {
  it('showState("loading") shows #state-loading and hides all other .state elements', () => {
    showState('loading');

    const loading = document.getElementById('state-loading');
    expect(loading.classList.contains('hidden')).toBe(false);

    const others = ['state-not-job-page', 'state-data-error', 'state-data-ready'];
    others.forEach(id => {
      expect(document.getElementById(id).classList.contains('hidden')).toBe(true);
    });
  });

  it('showState("not-job-page") shows #state-not-job-page', () => {
    showState('not-job-page');
    expect(document.getElementById('state-not-job-page').classList.contains('hidden')).toBe(false);
  });

  it('showState("data-ready") shows #state-data-ready and hides others', () => {
    showState('data-ready');

    expect(document.getElementById('state-data-ready').classList.contains('hidden')).toBe(false);

    const others = ['state-loading', 'state-not-job-page', 'state-data-error'];
    others.forEach(id => {
      expect(document.getElementById(id).classList.contains('hidden')).toBe(true);
    });
  });
});

describe('fillFields', () => {
  it('sets correct textContent for role, company, and url', () => {
    fillFields({ role: 'Engineer', company: 'ACME', url: 'https://example.com' });

    expect(document.getElementById('field-role').textContent).toBe('Engineer');
    expect(document.getElementById('field-company').textContent).toBe('ACME');
    expect(document.getElementById('field-url').textContent).toBe('https://example.com');
  });
});

describe('showDuplicateWarning', () => {
  it('removes hidden from #duplicate-warning and #btn-save-anyway', () => {
    showDuplicateWarning();

    expect(document.getElementById('duplicate-warning').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('btn-save-anyway').classList.contains('hidden')).toBe(false);
  });
});

describe('showSaveResult', () => {
  it('sets text and removes hidden from #save-result on success', () => {
    showSaveResult('success', 'Job saved ✓');

    const el = document.getElementById('save-result');
    expect(el.textContent).toBe('Job saved ✓');
    expect(el.classList.contains('hidden')).toBe(false);
  });

  it('sets class "error" on #save-result on error', () => {
    showSaveResult('error', 'Something went wrong');

    const el = document.getElementById('save-result');
    expect(el.textContent).toBe('Something went wrong');
    expect(el.classList.contains('error')).toBe(true);
    expect(el.classList.contains('hidden')).toBe(false);
  });
});

describe('formatDate', () => {
  it('returns "2024-01-15" for new Date("2024-01-15T00:00:00.000Z")', () => {
    expect(formatDate(new Date('2024-01-15T00:00:00.000Z'))).toBe('2024-01-15');
  });
});

describe('withTimeout', () => {
  it('rejects when timeout expires', async () => {
    vi.useFakeTimers();

    const promise = withTimeout(new Promise(() => {}), 1000);
    vi.advanceTimersByTime(1001);

    await expect(promise).rejects.toThrow('timeout');
    vi.useRealTimers();
  });

  it('resolves when promise resolves before timeout', async () => {
    vi.useFakeTimers();

    const promise = withTimeout(Promise.resolve('value'), 1000);
    await expect(promise).resolves.toBe('value');

    vi.useRealTimers();
  });
});
