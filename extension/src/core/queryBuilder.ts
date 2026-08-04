import type { SpotifyTrackItem } from "../spotify/types";

export function buildSearchQuery(item: SpotifyTrackItem): string | null {
  // Some playlist item responses nest the track/episode payload under `item` instead of
  // the documented `track` key (see SpotifyTrackItem) — try both.
  const track = item.track ?? item.item;
  // Loose inequality throughout: real API responses (e.g. local-file tracks) can omit a
  // field entirely (undefined) rather than send it as null — `=== null`/`!== null` alone
  // let that slip through and crash on the next property access.
  if (track == null) {
    return null;
  }

  let query = track.name ?? "";

  const album = track.album;
  if (album != null && album.name != null && album.name !== track.name) {
    query += ` ${album.name}`;
  }

  if (track.artists != null) {
    for (const artist of track.artists) {
      if (artist?.name != null) {
        query += ` ${artist.name}`;
      }
    }
  }

  query += " official";
  return query;
}
