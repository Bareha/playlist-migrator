import type { SpotifyTrackItem, SpotifyTracks } from "../spotify/types";

export type PageFetcher = (url: string) => Promise<SpotifyTracks>;

export async function collectAllTrackItems(
  firstPage: SpotifyTracks,
  fetchNextPage: PageFetcher,
): Promise<SpotifyTrackItem[]> {
  const all: SpotifyTrackItem[] = [];
  let page: SpotifyTracks | null = firstPage;
  // Loose inequality is deliberate: an API response that doesn't match SpotifyTracks at
  // runtime (e.g. missing/undefined) must stop the loop, not just a strict `=== null`.
  while (page != null) {
    if (page.items != null) {
      all.push(...page.items);
    }
    const next: string | null = page.next;
    page = next !== null ? await fetchNextPage(next) : null;
  }
  return all;
}
