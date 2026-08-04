export type MigrationStatus = "idle" | "in-progress" | "complete" | "error";

export interface TrackMatchResult {
  query: string;
  videoId: string | null; // null = no YouTube match was found for this query
}

export interface MigrationState {
  status: MigrationStatus;
  spotifyPlaylistId: string;
  playlistName: string;
  youtubePlaylistId: string | null;
  queries: string[];
  currentIndex: number;
  results: TrackMatchResult[];
  errorMessage?: string;
}

const STATE_STORAGE_KEY = "migration_state";

export async function saveMigrationState(state: MigrationState): Promise<void> {
  await chrome.storage.local.set({ [STATE_STORAGE_KEY]: state });
}

export async function loadMigrationState(): Promise<MigrationState | null> {
  const result = await chrome.storage.local.get(STATE_STORAGE_KEY);
  return (result[STATE_STORAGE_KEY] as MigrationState | undefined) ?? null;
}

export async function clearMigrationState(): Promise<void> {
  await chrome.storage.local.remove(STATE_STORAGE_KEY);
}
