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

  it("throws a YoutubeApiError with context and body on a non-2xx response", () => {
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
});
