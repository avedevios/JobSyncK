import { describe, it } from 'vitest';
import fc from 'fast-check';

// Мокируем chrome до импорта модуля
globalThis.chrome = {
  runtime: {
    onMessage: {
      addListener: () => {},
    },
  },
};

import { parseJobData } from '../lib/content.exports.js';

/**
 * Property 2: Парсер всегда возвращает непустую строку для role
 * Property 3: Парсер всегда возвращает непустую строку для company
 * Validates: Requirements 2.1, 2.4, 2.2, 2.5
 */
describe('parser.property — Property 2 & 3: непустые строки для role и company', () => {
  it('parseJobData всегда возвращает непустую строку для role и company при любом HTML', () => {
    fc.assert(
      fc.property(fc.string(), (html) => {
        document.body.innerHTML = html;
        const result = parseJobData();
        return (
          typeof result.role === 'string' &&
          result.role.length > 0 &&
          typeof result.company === 'string' &&
          result.company.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 4: Парсер не изменяет DOM страницы
 * Validates: Requirements 2.6
 */
describe('parser.property — Property 4: парсер не изменяет DOM', () => {
  it('parseJobData не изменяет document.body.innerHTML', () => {
    fc.assert(
      fc.property(fc.string(), (html) => {
        document.body.innerHTML = html;
        const before = document.body.innerHTML;
        parseJobData();
        const after = document.body.innerHTML;
        return before === after;
      }),
      { numRuns: 100 }
    );
  });
});
