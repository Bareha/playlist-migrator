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

// Titles matching this are usually full-album/compilation uploads rather than the single
// track — YouTube's relevance ranking sometimes puts these above the actual song, especially
// once the album name is folded into the search query (see core/queryBuilder.ts).
const LIKELY_NOT_A_SINGLE_TRACK =
  /\b(full album|album mix|complete album|entire album|discography|full ep|mixtape|greatest hits)\b/i;

// Mirrors App.java's search().list(...) — extended from Java's maxResults(1) to fetch a
// few candidates so an obviously-wrong top result (e.g. a full-album upload) can be
// skipped in favor of the next one. Returns null on no match, matching the "log and skip"
// behavior instead of the old silent-drop bug. search.list costs a flat 100 quota units
// regardless of maxResults/part, so this doesn't change quota cost (see core/quota.ts).
export async function searchVideoId(query: string): Promise<string | null> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    maxResults: "5",
    type: "video",
  });
  const result = await youtubeRequest<{
    items: Array<{ id: { videoId: string }; snippet?: { title?: string } }>;
  }>(`/search?${params.toString()}`, { method: "GET" }, `Failed to search YouTube for "${query}"`);

  const items = result.items ?? [];
  if (items.length === 0) {
    return null;
  }
  const bestMatch = items.find((item) => !LIKELY_NOT_A_SINGLE_TRACK.test(item.snippet?.title ?? ""));
  return (bestMatch ?? items[0]).id.videoId;
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
