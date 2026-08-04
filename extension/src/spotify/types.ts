export interface SpotifyOwner {
  display_name: string | null;
}

export interface SpotifyArtist {
  name: string;
}

export interface SpotifyAlbum {
  name: string | null;
}

export interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[] | null;
  album: SpotifyAlbum | null;
}

export interface SpotifyTrackItem {
  // Documented field name for the nested track/episode payload.
  track?: SpotifyTrack | null;
  // Empirically observed alternate field name for the exact same payload — some playlist
  // item responses use `item` instead of `track` (and don't include a `track` key at all).
  // NOTE: inside that payload there's also an unrelated boolean field literally named
  // `track` (a type discriminator, e.g. `track: true` / `episode: false`) — unrelated to
  // this field name collision, and not something SpotifyTrack reads. See core/queryBuilder.ts.
  item?: SpotifyTrack | null;
}

export interface SpotifyTracks {
  items: SpotifyTrackItem[] | null;
  next: string | null;
}

export interface SpotifyPlaylist {
  name: string;
  owner: SpotifyOwner;
  public: boolean | null;
  // Documented shape: the tracks paging object nested under `tracks`.
  tracks?: SpotifyTracks;
  // Empirically observed alternate shape for some playlists: the exact same paging object
  // (items + next) comes back under a key literally named `items` instead of `tracks`, with
  // no `tracks` key at all. Handled as a fallback in migration/orchestrator.ts.
  items?: SpotifyTracks;
}

export interface SpotifyTokenSet {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface StoredSpotifyTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}
