import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(__dirname, "../../manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

describe("manifest.json", () => {
  it("содержит все обязательные поля", () => {
    expect(manifest).toHaveProperty("manifest_version");
    expect(manifest).toHaveProperty("name");
    expect(manifest).toHaveProperty("version");
    expect(manifest).toHaveProperty("description");
    expect(manifest).toHaveProperty("permissions");
    expect(manifest).toHaveProperty("host_permissions");
    expect(manifest).toHaveProperty("background");
    expect(manifest).toHaveProperty("action");
    expect(manifest).toHaveProperty("content_scripts");
  });

  it("manifest_version === 3", () => {
    expect(manifest.manifest_version).toBe(3);
  });

  it("permissions содержит activeTab", () => {
    expect(manifest.permissions).toContain("activeTab");
  });

  it("host_permissions содержит https://www.linkedin.com/*", () => {
    expect(manifest.host_permissions).toContain("https://www.linkedin.com/*");
  });

  it("host_permissions содержит http://localhost:3333/*", () => {
    expect(manifest.host_permissions).toContain("http://localhost:3333/*");
  });

  it("content_scripts[0].matches содержит https://www.linkedin.com/jobs/view/*", () => {
    expect(manifest.content_scripts[0].matches).toContain(
      "https://www.linkedin.com/jobs/view/*"
    );
  });
});
