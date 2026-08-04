import type { SpotifyTrackItem } from "../spotify/types";

export function buildSearchQuery(item: SpotifyTrackItem): string | null {
  const track = item.track;
  if (track === null) {
    return null;
  }

  let query = track.name;

  const album = track.album;
  if (album !== null && album.name !== null && album.name !== track.name) {
    query += ` ${album.name}`;
  }

  if (track.artists !== null) {
    for (const artist of track.artists) {
      query += ` ${artist.name}`;
    }
  }

  query += " official";
  return query;
}
