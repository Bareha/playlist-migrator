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

// Removes the cached token from Chrome AND best-effort revokes it with Google, so
// "disconnect" actually disconnects rather than just hiding the connected state locally.
// The next "Connect YouTube" click (interactive) will prompt for an account again,
// which is how switching to a different Google account works.
export async function disconnectYoutube(): Promise<void> {
  let token: string | undefined;
  try {
    const result = await chrome.identity.getAuthToken({ interactive: false });
    token = result.token;
  } catch {
    return; // nothing cached — already effectively disconnected
  }
  if (!token) {
    return;
  }
  await chrome.identity.removeCachedAuthToken({ token });
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" });
  } catch {
    // Best-effort server-side revoke; the token is at least removed from Chrome's cache.
  }
}
