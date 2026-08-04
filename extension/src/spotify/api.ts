import { ensureSuccess } from "../core/httpValidation";
import { getValidSpotifyAccessToken } from "./auth";
import type { SpotifyPlaylist, SpotifyTracks } from "./types";

const API_BASE = "https://api.spotify.com/v1";

export async function fetchPlaylist(playlistId: string): Promise<SpotifyPlaylist> {
  const accessToken = await getValidSpotifyAccessToken();
  const response = await fetch(`${API_BASE}/playlists/${encodeURIComponent(playlistId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.text();
  ensureSuccess(response.status, body, `Failed to fetch playlist ${playlistId}`);
  return JSON.parse(body) as SpotifyPlaylist;
}

// Matches the PageFetcher signature expected by core/pagination.ts's collectAllTrackItems.
export async function fetchTracksPage(url: string): Promise<SpotifyTracks> {
  const accessToken = await getValidSpotifyAccessToken();
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.text();
  ensureSuccess(response.status, body, "Failed to fetch next page of tracks");
  return JSON.parse(body) as SpotifyTracks;
}
