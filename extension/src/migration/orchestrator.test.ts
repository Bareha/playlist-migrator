import { beforeEach, describe, expect, it, vi } from "vitest";
import { installChromeMock } from "../tests/mocks/chrome";

vi.mock("../youtube/api", () => ({
  createPlaylist: vi.fn(async (title: string) => `yt-playlist-${title}`),
  searchVideoId: vi.fn(async (query: string) => (query.includes("nomatch") ? null : `video-${query}`)),
  insertPlaylistItem: vi.fn(async () => undefined),
}));

vi.mock("../spotify/api", () => ({
  fetchPlaylist: vi.fn(async () => ({
    name: "My Playlist",
    owner: { display_name: "me" },
    public: true,
    tracks: {
      items: [
        { track: { name: "Song A", album: null, artists: [{ name: "Artist" }] } },
        { track: null }, // removed track — must be skipped, not crash
      ],
      next: null,
    },
  })),
  fetchTracksPage: vi.fn(),
}));

import { createPlaylist, insertPlaylistItem, searchVideoId } from "../youtube/api";
import { fetchPlaylist } from "../spotify/api";
import { prepareMigration, resumeMigration, startMigration } from "./orchestrator";
import { saveMigrationState } from "./state";

beforeEach(() => {
  installChromeMock();
  vi.clearAllMocks();
});

describe("prepareMigration", () => {
  it("builds queries, skips tracks with missing metadata, and estimates quota", async () => {
    const result = await prepareMigration("spotify123");
    expect(fetchPlaylist).toHaveBeenCalledWith("spotify123");
    expect(result.playlistName).toBe("My Playlist");
    expect(result.queries).toEqual(["Song A Artist official"]);
    expect(result.skippedCount).toBe(1);
    expect(result.quota.estimatedUnits).toBe(200); // 50 + 1*150
    expect(result.quota.exceedsDefaultDailyCap).toBe(false);
  });
});

describe("startMigration", () => {
  it("creates a playlist, matches tracks, and records results", async () => {
    const state = await startMigration("spotify123", "My Playlist", ["song a", "song b"]);
    expect(state.status).toBe("complete");
    expect(state.youtubePlaylistId).toBe("yt-playlist-My Playlist");
    expect(state.results).toEqual([
      { query: "song a", videoId: "video-song a" },
      { query: "song b", videoId: "video-song b" },
    ]);
    expect(createPlaylist).toHaveBeenCalledTimes(1);
    expect(insertPlaylistItem).toHaveBeenCalledTimes(2);
  });

  it("records a null match without inserting, instead of silently dropping it", async () => {
    const state = await startMigration("spotify123", "My Playlist", ["nomatch song"]);
    expect(state.results).toEqual([{ query: "nomatch song", videoId: null }]);
    expect(insertPlaylistItem).not.toHaveBeenCalled();
  });
});

describe("resumeMigration", () => {
  it("resumes from currentIndex without recreating the playlist or re-processing earlier tracks", async () => {
    await saveMigrationState({
      status: "in-progress",
      spotifyPlaylistId: "spotify123",
      playlistName: "My Playlist",
      youtubePlaylistId: "yt-existing",
      queries: ["song a", "song b"],
      currentIndex: 1,
      results: [{ query: "song a", videoId: "video-song a" }],
    });

    const state = await resumeMigration();

    expect(state?.status).toBe("complete");
    expect(state?.results).toEqual([
      { query: "song a", videoId: "video-song a" },
      { query: "song b", videoId: "video-song b" },
    ]);
    expect(createPlaylist).not.toHaveBeenCalled();
    expect(insertPlaylistItem).toHaveBeenCalledTimes(1);
    expect(searchVideoId).toHaveBeenCalledTimes(1);
    expect(searchVideoId).toHaveBeenCalledWith("song b");
  });

  it("returns null when there is no in-progress migration", async () => {
    const state = await resumeMigration();
    expect(state).toBeNull();
  });
});
