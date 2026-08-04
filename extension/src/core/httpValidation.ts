import { SpotifyApiError, YoutubeApiError } from "./errors";

export function ensureSuccess(statusCode: number, body: string, context: string): void {
  if (Math.floor(statusCode / 100) !== 2) {
    throw new SpotifyApiError(`${context} (HTTP ${statusCode}): ${body}`);
  }
}

// Known YouTube Data API error "reason" codes that have a much more actionable
// explanation than the raw JSON error blob — shown to the user as-is instead.
const FRIENDLY_YOUTUBE_ERROR_MESSAGES: Record<string, string> = {
  youtubeSignupRequired:
    'Your Google account doesn\'t have a YouTube channel yet. Go to youtube.com, sign in ' +
    'with the same account, and complete the one-time "Create channel" prompt — then try again.',
  quotaExceeded:
    "You've hit your YouTube API daily quota (default 10,000 units). Wait for it to reset " +
    "(~midnight Pacific time) or request a quota increase in Google Cloud Console, then try again.",
};

function extractYoutubeErrorReason(body: string): string | null {
  try {
    const parsed = JSON.parse(body) as { error?: { errors?: Array<{ reason?: string }> } };
    return parsed.error?.errors?.[0]?.reason ?? null;
  } catch {
    return null;
  }
}

// Java's equivalent used the google-api-client library, which validates responses
// automatically; the raw-fetch YouTube port needs this done explicitly instead.
export function ensureYoutubeSuccess(statusCode: number, body: string, context: string): void {
  if (Math.floor(statusCode / 100) !== 2) {
    const reason = extractYoutubeErrorReason(body);
    const friendlyMessage = reason ? FRIENDLY_YOUTUBE_ERROR_MESSAGES[reason] : undefined;
    throw new YoutubeApiError(friendlyMessage ?? `${context} (HTTP ${statusCode}): ${body}`);
  }
}
