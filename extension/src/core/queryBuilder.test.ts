import { describe, expect, it } from "vitest";
import { buildSearchQuery } from "./queryBuilder";
import type { SpotifyTrackItem } from "../spotify/types";

describe("buildSearchQuery", () => {
  it("includes the album when different from the track name", () => {
    const item: SpotifyTrackItem = {
      track: { name: "Song", album: { name: "Album" }, artists: [{ name: "Artist" }] },
    };
    expect(buildSearchQuery(item)).toBe("Song Album Artist official");
  });

  it("omits the album when it matches the track name", () => {
    const item: SpotifyTrackItem = {
      track: { name: "Song", album: { name: "Song" }, artists: [{ name: "Artist" }] },
    };
    expect(buildSearchQuery(item)).toBe("Song Artist official");
  });

  it("separates multiple artists with spaces", () => {
    const item: SpotifyTrackItem = {
      track: { name: "Song", album: null, artists: [{ name: "Drake" }, { name: "21 Savage" }] },
    };
    expect(buildSearchQuery(item)).toBe("Song Drake 21 Savage official");
  });

  it("returns null when the track has been removed", () => {
    const item: SpotifyTrackItem = { track: null };
    expect(buildSearchQuery(item)).toBeNull();
  });

  it("handles a missing album name", () => {
    const item: SpotifyTrackItem = {
      track: { name: "Song", album: { name: null }, artists: [{ name: "Artist" }] },
    };
    expect(buildSearchQuery(item)).toBe("Song Artist official");
  });

  it("returns null when the track field is undefined rather than explicitly null", () => {
    // Regression test: real API responses can omit a field (undefined) instead of
    // sending it as null — a strict `=== null` check alone missed this and crashed.
    const item = {} as SpotifyTrackItem;
    expect(buildSearchQuery(item)).toBeNull();
  });

  it("handles an undefined album instead of crashing", () => {
    const item = {
      track: { name: "Song", artists: [{ name: "Artist" }] },
    } as SpotifyTrackItem;
    expect(buildSearchQuery(item)).toBe("Song Artist official");
  });

  it("handles an undefined artists list instead of crashing", () => {
    const item = { track: { name: "Song", album: null } } as SpotifyTrackItem;
    expect(buildSearchQuery(item)).toBe("Song official");
  });

  it("handles a malformed artist entry instead of crashing", () => {
    const item = {
      track: { name: "Song", album: null, artists: [undefined, { name: "Artist" }] },
    } as SpotifyTrackItem;
    expect(buildSearchQuery(item)).toBe("Song Artist official");
  });

  it("falls back to the `item` field when there is no `track` field", () => {
    // Regression test using a trimmed real-world response: some playlist item responses
    // nest the payload under `item` instead of `track`, and don't include `track` at all.
    // Note `item.item.track` below is an unrelated boolean type-discriminator field, not
    // the payload — buildSearchQuery must not confuse the two.
    const playlistItem = {
      added_at: "2025-04-03T06:45:24Z",
      is_local: false,
      item: {
        type: "track",
        episode: false,
        track: true,
        album: { name: "View-Monster" },
        artists: [{ name: "Lemon Demon" }],
        name: "Bill Watterson",
      },
    } as unknown as SpotifyTrackItem;

    expect(buildSearchQuery(playlistItem)).toBe("Bill Watterson View-Monster Lemon Demon official");
  });
});
