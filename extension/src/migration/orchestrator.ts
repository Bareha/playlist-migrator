import { collectAllTrackItems } from "../core/pagination";
import { buildSearchQuery } from "../core/queryBuilder";
import { estimateYoutubeQuotaUnits } from "../core/quota";
import { fetchPlaylist, fetchTracksPage } from "../spotify/api";
import { createPlaylist, insertPlaylistItem, searchVideoId } from "../youtube/api";
import { loadMigrationState, saveMigrationState, type MigrationState } from "./state";

const DEFAULT_DAILY_QUOTA_CAP = 10_000;

export interface QuotaEstimate {
  trackCount: number;
  estimatedUnits: number;
  exceedsDefaultDailyCap: boolean;
}

export interface MigrationPreparation {
  playlistName: string;
  queries: string[];
  skippedCount: number;
  quota: QuotaEstimate;
}

// Fetches and paginates the full Spotify playlist, builds the query list, and estimates
// quota cost — without starting the migration. The popup uses this to show a preview
// (name, track count, quota warning) before the user confirms.
export async function prepareMigration(spotifyPlaylistId: string): Promise<MigrationPreparation> {
  const playlist = await fetchPlaylist(spotifyPlaylistId);
  const allTrackItems = await collectAllTrackItems(playlist.tracks, fetchTracksPage);

  const queries: string[] = [];
  let skippedCount = 0;
  for (const item of allTrackItems) {
    const query = buildSearchQuery(item);
    if (query === null) {
      skippedCount += 1;
      continue;
    }
    queries.push(query);
  }

  const estimatedUnits = estimateYoutubeQuotaUnits(queries.length);

  return {
    playlistName: playlist.name,
    queries,
    skippedCount,
    quota: {
      trackCount: queries.length,
      estimatedUnits,
      exceedsDefaultDailyCap: estimatedUnits > DEFAULT_DAILY_QUOTA_CAP,
    },
  };
}

export type ProgressListener = (state: MigrationState) => void;

// Starts a brand-new migration from an already-prepared query list (see prepareMigration).
// Deliberately takes no Spotify playlist ID beyond bookkeeping — everything the loop needs
// is persisted into MigrationState up front, so a resumed worker never re-fetches Spotify.
export async function startMigration(
  spotifyPlaylistId: string,
  playlistName: string,
  queries: string[],
  onProgress?: ProgressListener,
): Promise<MigrationState> {
  const state: MigrationState = {
    status: "in-progress",
    spotifyPlaylistId,
    playlistName,
    youtubePlaylistId: null,
    queries,
    currentIndex: 0,
    results: [],
  };
  await saveMigrationState(state);
  return runMigration(state, onProgress);
}

// Picks up wherever chrome.storage.local says the migration left off. Safe to call after
// a service worker restart/kill: state is only ever advanced after each track's outcome
// (insert succeeded, or determined "no match") is durably committed, so resuming never
// re-processes a completed track or recreates the YouTube playlist.
export async function resumeMigration(onProgress?: ProgressListener): Promise<MigrationState | null> {
  const state = await loadMigrationState();
  if (state === null || state.status !== "in-progress") {
    return null;
  }
  return runMigration(state, onProgress);
}

async function runMigration(state: MigrationState, onProgress?: ProgressListener): Promise<MigrationState> {
  try {
    if (state.youtubePlaylistId === null) {
      state.youtubePlaylistId = await createPlaylist(state.playlistName);
      await saveMigrationState(state);
      onProgress?.(state);
    }

    while (state.currentIndex < state.queries.length) {
      const query = state.queries[state.currentIndex];
      const videoId = await searchVideoId(query);

      if (videoId !== null) {
        await insertPlaylistItem(state.youtubePlaylistId, videoId);
      }

      state.results.push({ query, videoId });
      state.currentIndex += 1;
      await saveMigrationState(state);
      onProgress?.(state);
    }

    state.status = "complete";
    await saveMigrationState(state);
    onProgress?.(state);
    return state;
  } catch (error) {
    state.status = "error";
    state.errorMessage = error instanceof Error ? error.message : String(error);
    await saveMigrationState(state);
    onProgress?.(state);
    throw error;
  }
}
