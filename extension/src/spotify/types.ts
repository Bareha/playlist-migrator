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
  tracks: SpotifyTracks;
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
