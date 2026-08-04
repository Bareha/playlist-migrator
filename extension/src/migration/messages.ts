import type { MigrationPreparation } from "./orchestrator";
import type { MigrationState } from "./state";

export type PopupToBackgroundMessage =
  | { type: "GET_AUTH_STATUS" }
  | { type: "CONNECT_SPOTIFY" }
  | { type: "CONNECT_YOUTUBE" }
  | { type: "PREPARE_MIGRATION"; spotifyPlaylistId: string }
  | { type: "START_MIGRATION"; spotifyPlaylistId: string; playlistName: string; queries: string[] }
  | { type: "GET_STATE" };

export type BackgroundToPopupMessage =
  | { type: "AUTH_STATUS"; spotifyConnected: boolean; youtubeConnected: boolean }
  | { type: "MIGRATION_PREPARED"; preparation: MigrationPreparation }
  | { type: "PROGRESS_UPDATE"; state: MigrationState }
  | { type: "MIGRATION_COMPLETE"; state: MigrationState }
  | { type: "MIGRATION_ERROR"; message: string }
  | { type: "STATE"; state: MigrationState | null };
