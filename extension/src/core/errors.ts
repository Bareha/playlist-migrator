export class SpotifyApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

export class YoutubeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "YoutubeApiError";
  }
}
