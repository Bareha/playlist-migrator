import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./auth", () => ({
  getYoutubeAccessToken: vi.fn(async () => "test-token"),
  invalidateYoutubeToken: vi.fn(async () => undefined),
}));

import { searchVideoId } from "./api";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("searchVideoId", () => {
  it("returns the top result when its title looks like a normal single-track upload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          items: [
            { id: { videoId: "good-video" }, snippet: { title: "Artist - Song (Official Video)" } },
            { id: { videoId: "other-video" }, snippet: { title: "Some Other Song" } },
          ],
        }),
      ),
    );

    expect(await searchVideoId("Song Artist official")).toBe("good-video");
  });

  it("skips a full-album top result in favor of the next candidate", async () => {
    // Regression test: reported real-world failure — the top search result was a
    // "Full Album" upload instead of the single track.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          items: [
            { id: { videoId: "wrong-full-album" }, snippet: { title: "Artist - Album Name (Full Album)" } },
            { id: { videoId: "right-song" }, snippet: { title: "Artist - Song (Official Audio)" } },
          ],
        }),
      ),
    );

    expect(await searchVideoId("Song Album Artist official")).toBe("right-song");
  });

  it("falls back to the top result if every candidate looks like a full-album upload", async () => {
    // Better to still return something (prior behavior) than skip the track entirely
    // when the search genuinely didn't surface a clean single-track match.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          items: [
            { id: { videoId: "album-1" }, snippet: { title: "Artist - Full Album" } },
            { id: { videoId: "album-2" }, snippet: { title: "Artist - Greatest Hits" } },
          ],
        }),
      ),
    );

    expect(await searchVideoId("Song Artist official")).toBe("album-1");
  });

  it("returns null when there are no results", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ items: [] })));

    expect(await searchVideoId("nonexistent song xyz")).toBeNull();
  });
});
