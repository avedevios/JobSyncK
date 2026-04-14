import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isDuplicateUrl,
  buildPayload,
  checkDuplicate,
  saveVacancy,
} from "../lib/background.exports.js";

const BACKEND_UNAVAILABLE_MSG =
  "Backend unavailable. Make sure the server is running on http://localhost:3333";

const mockPayload = {
  role: "Software Engineer",
  company: "ACME Corp",
  applied_at: "2024-01-15",
  applied: false,
  status: "saved",
  url: "https://www.linkedin.com/jobs/view/123456789/",
};

describe("isDuplicateUrl", () => {
  it("returns false for an empty array", () => {
    expect(isDuplicateUrl([], "https://example.com/job/1")).toBe(false);
  });

  it("returns true when URL is found in the list", () => {
    const vacancies = [
      { url: "https://example.com/job/1", role: "Dev", company: "A" },
      { url: "https://example.com/job/2", role: "QA", company: "B" },
    ];
    expect(isDuplicateUrl(vacancies, "https://example.com/job/1")).toBe(true);
  });

  it("returns false when URL is not found in the list", () => {
    const vacancies = [
      { url: "https://example.com/job/1", role: "Dev", company: "A" },
    ];
    expect(isDuplicateUrl(vacancies, "https://example.com/job/99")).toBe(false);
  });
});

describe("saveVacancy", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with POST method and Content-Type: application/json", async () => {
    fetch.mockResolvedValue({
      status: 201,
      json: async () => ({ id: 1, ...mockPayload }),
    });

    await saveVacancy(mockPayload);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("http://localhost:3333/vacancies");
    expect(options.method).toBe("POST");
    expect(options.headers["Content-Type"]).toBe("application/json");
  });

  it("returns { success: true } when backend responds with 201", async () => {
    const vacancy = { id: 42, ...mockPayload };
    fetch.mockResolvedValue({
      status: 201,
      json: async () => vacancy,
    });

    const result = await saveVacancy(mockPayload);

    expect(result.success).toBe(true);
    expect(result.vacancy).toEqual(vacancy);
  });

  it("returns { success: false, error } when backend responds with 400", async () => {
    fetch.mockResolvedValue({
      status: 400,
      json: async () => ({ error: "Validation failed" }),
    });

    const result = await saveVacancy(mockPayload);

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
    expect(result.status).toBe(400);
  });

  it("returns { success: false, error } when backend responds with 500", async () => {
    fetch.mockResolvedValue({
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    const result = await saveVacancy(mockPayload);

    expect(result.success).toBe(false);
    expect(typeof result.error).toBe("string");
    expect(result.error.length).toBeGreaterThan(0);
    expect(result.status).toBe(500);
  });

  it("returns backend unavailable message when fetch throws TypeError", async () => {
    const typeError = new TypeError("Failed to fetch");
    fetch.mockRejectedValue(typeError);

    const result = await saveVacancy(mockPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe(BACKEND_UNAVAILABLE_MSG);
  });

  it("returns backend unavailable message when fetch throws TimeoutError", async () => {
    const timeoutError = new DOMException("The operation was aborted.", "TimeoutError");
    fetch.mockRejectedValue(timeoutError);

    const result = await saveVacancy(mockPayload);

    expect(result.success).toBe(false);
    expect(result.error).toBe(BACKEND_UNAVAILABLE_MSG);
  });
});

describe("checkDuplicate", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns true when URL is found in the vacancies list", async () => {
    const targetUrl = "https://www.linkedin.com/jobs/view/123456789/";
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { url: targetUrl, role: "Dev", company: "A" },
        { url: "https://other.com/job/2", role: "QA", company: "B" },
      ],
    });

    const result = await checkDuplicate(targetUrl);

    expect(result).toBe(true);
  });

  it("returns false when URL is not found in the vacancies list", async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => [
        { url: "https://other.com/job/1", role: "Dev", company: "A" },
      ],
    });

    const result = await checkDuplicate("https://www.linkedin.com/jobs/view/999/");

    expect(result).toBe(false);
  });

  it("returns false on network error (fail-open)", async () => {
    fetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const result = await checkDuplicate("https://www.linkedin.com/jobs/view/123/");

    expect(result).toBe(false);
  });

  it("returns false when backend returns non-ok response (fail-open)", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 500,
    });

    const result = await checkDuplicate("https://www.linkedin.com/jobs/view/123/");

    expect(result).toBe(false);
  });
});
