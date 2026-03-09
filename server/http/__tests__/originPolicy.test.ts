import { describe, expect, it } from "vitest";
import { isOriginAllowed, parseAllowedOrigins } from "../originPolicy";

describe("originPolicy", () => {
  it("parses comma-separated origins", () => {
    expect(
      parseAllowedOrigins("https://splendor.rohil.org, https://app.example.com/")
    ).toEqual(["https://splendor.rohil.org", "https://app.example.com"]);
  });

  it("allows all origins when no allowlist is configured", () => {
    expect(isOriginAllowed("https://splendor.rohil.org", [])).toBe(true);
  });

  it("checks origins against the configured allowlist", () => {
    expect(
      isOriginAllowed("https://splendor.rohil.org/", ["https://splendor.rohil.org"])
    ).toBe(true);
    expect(isOriginAllowed("https://other.example.com", ["https://splendor.rohil.org"])).toBe(
      false
    );
  });
});
