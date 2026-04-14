/**
 * Property 6: Тело POST-запроса содержит все обязательные поля с корректными типами
 * Validates: Requirements 4.2
 */
import { describe, it } from "vitest";
import * as fc from "fast-check";
import { buildPayload } from "../lib/background.exports.js";

describe("Property 6: buildPayload always returns a valid VacancyPayload", () => {
  it("returns an object with all required fields and correct types for any input", () => {
    fc.assert(
      fc.property(
        fc.record({
          role: fc.string({ minLength: 1 }),
          company: fc.string({ minLength: 1 }),
          url: fc.webUrl(),
        }),
        (data) => {
          const payload = buildPayload(data);

          // role and company are non-empty strings
          if (typeof payload.role !== "string" || payload.role.length === 0) return false;
          if (typeof payload.company !== "string" || payload.company.length === 0) return false;

          // applied_at matches YYYY-MM-DD format
          if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.applied_at)) return false;

          // applied is always false
          if (payload.applied !== false) return false;

          // status is always "saved"
          if (payload.status !== "saved") return false;

          // url is a string
          if (typeof payload.url !== "string") return false;

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
