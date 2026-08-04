// playlists.insert (50) + per-track search.list (100) + playlistItems.insert (50)
export function estimateYoutubeQuotaUnits(trackCount: number): number {
  return 50 + trackCount * 150;
}
