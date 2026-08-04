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
  track: SpotifyTrack | null;
}

export interface SpotifyTracks {
  items: SpotifyTrackItem[] | null;
  next: string | null;
}

export interface SpotifyPlaylist {
  name: string;
  owner: SpotifyOwner;
  public: boolean | null;
  // Documented shape: tracks paging object nested under `tracks`.
  tracks?: SpotifyTracks;
  // Empirically observed alternate shape for some playlists: the tracks paging object's
  // `items`/`next` fields come back as siblings of `name`/`owner` instead of nested under
  // `tracks`, with no `tracks` key at all. Handled as a fallback in migration/orchestrator.ts.
  items?: SpotifyTrackItem[];
  next?: string | null;
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
