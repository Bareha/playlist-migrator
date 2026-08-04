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
});
