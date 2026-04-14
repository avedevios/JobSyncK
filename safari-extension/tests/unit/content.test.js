import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock chrome before module import
globalThis.chrome = {
  runtime: {
    onMessage: {
      addListener: vi.fn(),
    },
  },
};

import { parseJobData, trySelectors } from '../lib/content.exports.js';

describe('content.js — parseJobData', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('extracts role from h1.top-card-layout__title', () => {
    document.body.innerHTML = '<h1 class="top-card-layout__title">Senior Engineer</h1>';
    const result = parseJobData();
    expect(result.role).toBe('Senior Engineer');
  });

  it('extracts role from fallback selector h1[class*="job-title"]', () => {
    document.body.innerHTML = '<h1 class="some-job-title-class">Product Manager</h1>';
    const result = parseJobData();
    expect(result.role).toBe('Product Manager');
  });

  it('returns "Unknown" for role when no selector matches', () => {
    document.body.innerHTML = '<div>No heading here</div>';
    const result = parseJobData();
    expect(result.role).toBe('Unknown');
  });

  it('extracts company from .topcard__org-name-link', () => {
    document.body.innerHTML = `
      <div class="top-card-layout__card">
        <a class="topcard__org-name-link">Google</a>
      </div>
    `;
    const result = parseJobData();
    expect(result.company).toBe('Google');
  });

  it('returns "Unknown" for company when no selector matches', () => {
    document.body.innerHTML = '<div>No company here</div>';
    const result = parseJobData();
    expect(result.company).toBe('Unknown');
  });
});

describe('content.js — trySelectors', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns "" for an empty array', () => {
    expect(trySelectors([])).toBe('');
  });

  it('skips elements with empty textContent', () => {
    document.body.innerHTML = `
      <h1 class="top-card-layout__title">   </h1>
      <h1 class="some-job-title-class">Real Title</h1>
    `;
    const result = trySelectors([
      'h1.top-card-layout__title',
      'h1[class*="job-title"]',
    ]);
    expect(result).toBe('Real Title');
  });
});
