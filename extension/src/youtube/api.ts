import { ensureYoutubeSuccess } from "../core/httpValidation";
import { getYoutubeAccessToken, invalidateYoutubeToken } from "./auth";

const API_BASE = "https://www.googleapis.com/youtube/v3";

async function youtubeRequest<T>(path: string, init: RequestInit, context: string): Promise<T> {
  const attempt = (accessToken: string) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init.headers ?? {}), Authorization: `Bearer ${accessToken}` },
    });

  let accessToken = await getYoutubeAccessToken();
  let response = await attempt(accessToken);

  if (response.status === 401) {
    await invalidateYoutubeToken(accessToken);
    accessToken = await getYoutubeAccessToken();
    response = await attempt(accessToken);
  }

  const body = await response.text();
  ensureYoutubeSuccess(response.status, body, context);
  return body.length > 0 ? (JSON.parse(body) as T) : (undefined as T);
}

// Mirrors App.java's playlists().insert(...) — creates a new private playlist.
export async function createPlaylist(title: string): Promise<string> {
  const result = await youtubeRequest<{ id: string }>(
    "/playlists?part=snippet,status",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snippet: { title },
        status: { privacyStatus: "private" },
      }),
    },
    `Failed to create YouTube playlist "${title}"`,
  );
  return result.id;
}

// Mirrors App.java's search().list(...).setMaxResults(1L) — returns null on no match,
// matching the "log and skip" behavior instead of the old silent-drop bug.
export async function searchVideoId(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    part: "id",
    q: query,
    maxResults: "1",
    type: "video",
  });
  const result = await youtubeRequest<{ items: Array<{ id: { videoId: string } }> }>(
    `/search?${params.toString()}`,
    { method: "GET" },
    `Failed to search YouTube for "${query}"`,
  );
  return result.items[0]?.id.videoId ?? null;
}

// Mirrors App.java's playlistItems().insert(...).
export async function insertPlaylistItem(playlistId: string, videoId: string): Promise<void> {
  await youtubeRequest<unknown>(
    "/playlistItems?part=snippet",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snippet: {
          playlistId,
          resourceId: { kind: "youtube#video", videoId },
        },
      }),
    },
    `Failed to add video ${videoId} to playlist ${playlistId}`,
  );
}
