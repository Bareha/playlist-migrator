import { describe, expect, it } from "vitest";
import { ensureSuccess, ensureYoutubeSuccess } from "./httpValidation";
import { SpotifyApiError, YoutubeApiError } from "./errors";

describe("ensureSuccess", () => {
  it("does not throw on a 2xx response", () => {
    expect(() => ensureSuccess(200, "{}", "ctx")).not.toThrow();
  });

  it("throws a SpotifyApiError with context and body on a 4xx response", () => {
    try {
      ensureSuccess(
        404,
        '{"error":{"status":404,"message":"not found"}}',
        "Failed to fetch playlist abc123",
      );
      expect.fail("expected SpotifyApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(SpotifyApiError);
      const message = (error as Error).message;
      expect(message).toContain("Failed to fetch playlist abc123");
      expect(message).toContain("404");
      expect(message).toContain("not found");
    }
  });
});

describe("ensureYoutubeSuccess", () => {
  it("does not throw on a 2xx response", () => {
    expect(() => ensureYoutubeSuccess(200, "{}", "ctx")).not.toThrow();
  });

  it("throws a YoutubeApiError with context and body on a non-2xx response with no known reason", () => {
    try {
      ensureYoutubeSuccess(403, '{"error":{"message":"quotaExceeded"}}', "Failed to search YouTube");
      expect.fail("expected YoutubeApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(YoutubeApiError);
      const message = (error as Error).message;
      expect(message).toContain("Failed to search YouTube");
      expect(message).toContain("403");
      expect(message).toContain("quotaExceeded");
    }
  });

  it("translates youtubeSignupRequired into actionable guidance", () => {
    // Real response body observed from a Google account with no YouTube channel yet.
    const body = JSON.stringify({
      error: {
        code: 401,
        message: "Unauthorized",
        errors: [
          {
            message: "Unauthorized",
            domain: "youtube.header",
            reason: "youtubeSignupRequired",
            location: "Authorization",
            locationType: "header",
          },
        ],
      },
    });

    try {
      ensureYoutubeSuccess(401, body, 'Failed to create YouTube playlist "test playlist"');
      expect.fail("expected YoutubeApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(YoutubeApiError);
      const message = (error as Error).message;
      expect(message).toContain("doesn't have a YouTube channel yet");
      expect(message).toContain("youtube.com");
      // The friendly message replaces the raw JSON entirely — no need to see the blob too.
      expect(message).not.toContain("youtube.header");
    }
  });

  it("translates quotaExceeded into actionable guidance", () => {
    const body = JSON.stringify({
      error: { code: 403, message: "quotaExceeded", errors: [{ reason: "quotaExceeded" }] },
    });

    try {
      ensureYoutubeSuccess(403, body, "Failed to search YouTube");
      expect.fail("expected YoutubeApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(YoutubeApiError);
      expect((error as Error).message).toContain("daily quota");
    }
  });

  it("falls back to the raw message when the body isn't valid JSON", () => {
    try {
      ensureYoutubeSuccess(500, "<html>Internal Server Error</html>", "Failed to search YouTube");
      expect.fail("expected YoutubeApiError");
    } catch (error) {
      expect(error).toBeInstanceOf(YoutubeApiError);
      expect((error as Error).message).toContain("Internal Server Error");
    }
  });
});
