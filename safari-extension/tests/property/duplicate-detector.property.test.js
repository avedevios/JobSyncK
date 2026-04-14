/**
 * Property 7: Обнаружение дубликата по URL
 * Validates: Requirements 5.2
 */
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { isDuplicateUrl } from "../lib/background.exports.js";

describe("Property 7: isDuplicateUrl correctly detects duplicates", () => {
  it("returns the same result as Array.some for any vacancies array and url", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            url: fc.webUrl(),
            role: fc.string(),
            company: fc.string(),
          })
        ),
        fc.webUrl(),
        (vacancies, url) => {
          const result = isDuplicateUrl(vacancies, url);
          const expected = vacancies.some((v) => v.url === url);
          return result === expected;
        }
      ),
      { numRuns: 100 }
    );
  });
});
