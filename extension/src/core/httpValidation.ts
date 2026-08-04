import { SpotifyApiError, YoutubeApiError } from "./errors";

export function ensureSuccess(statusCode: number, body: string, context: string): void {
  if (Math.floor(statusCode / 100) !== 2) {
    throw new SpotifyApiError(`${context} (HTTP ${statusCode}): ${body}`);
  }
}

// Java's equivalent used the google-api-client library, which validates responses
// automatically; the raw-fetch YouTube port needs this done explicitly instead.
export function ensureYoutubeSuccess(statusCode: number, body: string, context: string): void {
  if (Math.floor(statusCode / 100) !== 2) {
    throw new YoutubeApiError(`${context} (HTTP ${statusCode}): ${body}`);
  }
}
