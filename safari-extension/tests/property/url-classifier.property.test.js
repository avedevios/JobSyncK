import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { isJobPage } from '../lib/popup.exports.js';

/**
 * Property 1: URL-паттерн корректно классифицирует страницы
 * Validates: Requirements 1.2
 */
describe('isJobPage — Property 1: URL-паттерн корректно классифицирует страницы', () => {
  it('isJobPage(url) === /^https:\\/\\/www\\.linkedin\\.com\\/jobs\\/view\\//.test(url) for any URL', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.webUrl(),
          fc.constant('https://www.linkedin.com/jobs/view/123456789/')
        ),
        (url) => {
          const result = isJobPage(url);
          const expected = /^https:\/\/www\.linkedin\.com\/jobs\/view\//.test(url);
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});
