// chrome.identity caches tokens in memory and handles refresh internally — unlike
// the Spotify PKCE flow, there is no manual persistence layer needed here.

export async function getYoutubeAccessToken(interactive = true): Promise<string> {
  const result = await chrome.identity.getAuthToken({ interactive });
  if (!result.token) {
    throw new Error("Failed to obtain a YouTube access token");
  }
  return result.token;
}

export async function invalidateYoutubeToken(token: string): Promise<void> {
  await chrome.identity.removeCachedAuthToken({ token });
}

// Non-interactive check used to render auth status in the popup — never prompts the user.
export async function isYoutubeConnected(): Promise<boolean> {
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false });
    return Boolean(result.token);
  } catch {
    return false;
  }
}
