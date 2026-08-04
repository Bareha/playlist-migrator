import { describe, expect, it } from "vitest";
import { generateCodeChallenge, generateCodeVerifier } from "./auth";

const ALLOWED_VERIFIER_CHARS = /^[A-Za-z0-9\-._~]+$/;

describe("generateCodeVerifier", () => {
  it("produces a string within RFC 7636's 43-128 char range using only unreserved characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(ALLOWED_VERIFIER_CHARS);
  });

  it("produces different values on each call", () => {
    expect(generateCodeVerifier()).not.toBe(generateCodeVerifier());
  });
});

describe("generateCodeChallenge", () => {
  it("computes the base64url-encoded SHA-256 digest of the verifier", async () => {
    // Expected value independently computed via Node's crypto module:
    // base64url(sha256("test-verifier-fixed-value"))
    const challenge = await generateCodeChallenge("test-verifier-fixed-value");
    expect(challenge).toBe("LsjS--yRJZO-duTPT8CJkUs7VtgyGf8yALyYfrBuPvU");
  });

  it("never contains base64 padding or non-url-safe characters", async () => {
    const challenge = await generateCodeChallenge(generateCodeVerifier());
    expect(challenge).not.toMatch(/[+/=]/);
  });
});
