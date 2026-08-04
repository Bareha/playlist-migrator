import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCodeChallenge, generateCodeVerifier, startSpotifyAuth } from "./auth";
import { installChromeMock } from "../tests/mocks/chrome";

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

describe("startSpotifyAuth (single-flight)", () => {
  beforeEach(() => {
    installChromeMock();

    // Extend the storage-only chrome mock with a fake chrome.identity for this suite.
    (globalThis as unknown as { chrome: { identity: unknown } }).chrome.identity = {
      getRedirectURL: () => "https://test-extension-id.chromiumapp.org/",
      launchWebAuthFlow: vi.fn(async ({ url }: { url: string }) => {
        const state = new URL(url).searchParams.get("state") ?? "";
        return `https://test-extension-id.chromiumapp.org/?code=test-code&state=${state}`;
      }),
    };

    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ access_token: "at", token_type: "Bearer", expires_in: 3600, refresh_token: "rt" }),
            { status: 200 },
          ),
      ),
    );
  });

  it("only opens one Spotify auth window when called twice concurrently", async () => {
    // Regression test: reopening the popup mid-flow and clicking "Connect Spotify" again
    // used to clobber the first flow's stored PKCE state and fail with
    // "authorization state was lost". Both calls must now share a single flow.
    await Promise.all([startSpotifyAuth(), startSpotifyAuth()]);

    const identity = (globalThis as unknown as { chrome: { identity: { launchWebAuthFlow: ReturnType<typeof vi.fn> } } })
      .chrome.identity;
    expect(identity.launchWebAuthFlow).toHaveBeenCalledTimes(1);
  });

  it("allows a fresh auth flow after the previous one has finished", async () => {
    await startSpotifyAuth();
    await startSpotifyAuth();

    const identity = (globalThis as unknown as { chrome: { identity: { launchWebAuthFlow: ReturnType<typeof vi.fn> } } })
      .chrome.identity;
    expect(identity.launchWebAuthFlow).toHaveBeenCalledTimes(2);
  });
});
