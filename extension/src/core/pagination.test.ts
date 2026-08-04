import { describe, expect, it } from "vitest";
import { collectAllTrackItems } from "./pagination";
import type { SpotifyTracks } from "../spotify/types";

describe("collectAllTrackItems", () => {
  it("follows pagination and merges items in order", async () => {
    const firstPage: SpotifyTracks = {
      items: [{ track: { name: "A", album: null, artists: null } }, { track: { name: "B", album: null, artists: null } }],
      next: "http://example.com/page2",
    };
    const secondPage: SpotifyTracks = {
      items: [{ track: { name: "C", album: null, artists: null } }],
      next: null,
    };

    const result = await collectAllTrackItems(firstPage, async (url) => {
      expect(url).toBe("http://example.com/page2");
      return secondPage;
    });

    expect(result).toHaveLength(3);
    expect(result[0].track?.name).toBe("A");
    expect(result[1].track?.name).toBe("B");
    expect(result[2].track?.name).toBe("C");
  });

  it("stops when next is null without fetching a page", async () => {
    const onlyPage: SpotifyTracks = {
      items: [{ track: { name: "A", album: null, artists: null } }],
      next: null,
    };

    const result = await collectAllTrackItems(onlyPage, async () => {
      throw new Error("should not fetch a next page when next is null");
    });

    expect(result).toHaveLength(1);
  });

  it("returns an empty list instead of throwing if the first page is undefined at runtime", async () => {
    // Regression test: an API response that doesn't actually match SpotifyTracks (e.g. a
    // missing `tracks` field) must not crash with "Cannot read properties of undefined".
    const result = await collectAllTrackItems(undefined as unknown as SpotifyTracks, async () => {
      throw new Error("should not fetch a next page when the first page is undefined");
    });

    expect(result).toHaveLength(0);
  });
});
