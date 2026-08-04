import { ensureSuccess } from "../core/httpValidation";
import type { SpotifyTokenSet, StoredSpotifyTokens } from "./types";

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID as string;
const SPOTIFY_AUTH_SCOPES = "playlist-read-private playlist-read-collaborative";
const AUTHORIZE_ENDPOINT = "https://accounts.spotify.com/authorize";
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";

const TOKEN_STORAGE_KEY = "spotify_tokens";
const PKCE_TRANSIENT_KEY = "spotify_pkce_transient";
const CODE_VERIFIER_LENGTH = 64; // within RFC 7636's required 43-128 char range

// Expired 60s early so a request started right at the boundary doesn't race the real expiry.
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

interface PkceTransient {
  codeVerifier: string;
  state: string;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function generateCodeVerifier(): string {
  const allowedChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const randomValues = crypto.getRandomValues(new Uint8Array(CODE_VERIFIER_LENGTH));
  let verifier = "";
  for (const value of randomValues) {
    verifier += allowedChars[value % allowedChars.length];
  }
  return verifier;
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

export function buildAuthorizationUrl(codeChallenge: string, redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: SPOTIFY_CLIENT_ID,
    scope: SPOTIFY_AUTH_SCOPES,
    redirect_uri: redirectUri,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    state,
  });
  return `${AUTHORIZE_ENDPOINT}?${params.toString()}`;
}

// Transient — only needed for the few seconds between launching and completing
// the auth flow, so it belongs in session storage rather than local storage.
function getTransientStorageArea(): chrome.storage.StorageArea {
  return chrome.storage.session ?? chrome.storage.local;
}

async function exchangeCodeForToken(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<SpotifyTokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const responseBody = await response.text();
  ensureSuccess(response.status, responseBody, "Failed to exchange Spotify authorization code");
  return JSON.parse(responseBody) as SpotifyTokenSet;
}

async function refreshAccessToken(refreshToken: string): Promise<SpotifyTokenSet> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const responseBody = await response.text();
  ensureSuccess(response.status, responseBody, "Failed to refresh Spotify access token");
  return JSON.parse(responseBody) as SpotifyTokenSet;
}

async function persistTokens(tokenSet: SpotifyTokenSet, previousRefreshToken?: string): Promise<void> {
  // Spotify may or may not rotate the refresh token on refresh — keep the newest one if given,
  // otherwise carry the previous one forward.
  const refreshToken = tokenSet.refresh_token ?? previousRefreshToken;
  if (!refreshToken) {
    throw new Error("Spotify token response did not include a refresh token");
  }
  const stored: StoredSpotifyTokens = {
    accessToken: tokenSet.access_token,
    refreshToken,
    expiresAt: Date.now() + tokenSet.expires_in * 1000,
  };
  await chrome.storage.local.set({ [TOKEN_STORAGE_KEY]: stored });
}

async function loadStoredTokens(): Promise<StoredSpotifyTokens | null> {
  const result = await chrome.storage.local.get(TOKEN_STORAGE_KEY);
  return (result[TOKEN_STORAGE_KEY] as StoredSpotifyTokens | undefined) ?? null;
}

export async function clearStoredTokens(): Promise<void> {
  await chrome.storage.local.remove(TOKEN_STORAGE_KEY);
}

export async function isSpotifyConnected(): Promise<boolean> {
  return (await loadStoredTokens()) !== null;
}

// Drives the full PKCE flow: generates verifier/challenge/state, opens the Spotify
// consent screen via chrome.identity, validates the returned state, and exchanges
// the code for tokens.
export async function startSpotifyAuth(): Promise<void> {
  const redirectUri = chrome.identity.getRedirectURL();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateCodeVerifier();

  await getTransientStorageArea().set({
    [PKCE_TRANSIENT_KEY]: { codeVerifier, state } satisfies PkceTransient,
  });

  const authUrl = buildAuthorizationUrl(codeChallenge, redirectUri, state);

  const redirectedTo = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true,
  });
  if (!redirectedTo) {
    throw new Error("Spotify authorization was cancelled or failed");
  }

  const redirectUrl = new URL(redirectedTo);
  const code = redirectUrl.searchParams.get("code");
  const returnedState = redirectUrl.searchParams.get("state");
  const authError = redirectUrl.searchParams.get("error");

  const transientResult = await getTransientStorageArea().get(PKCE_TRANSIENT_KEY);
  const transient = transientResult[PKCE_TRANSIENT_KEY] as PkceTransient | undefined;
  await getTransientStorageArea().remove(PKCE_TRANSIENT_KEY);

  if (authError) {
    throw new Error(`Spotify authorization failed: ${authError}`);
  }
  if (!transient) {
    throw new Error("Spotify authorization state was lost — please try again");
  }
  if (returnedState !== transient.state) {
    throw new Error("Spotify authorization state mismatch — please try again");
  }
  if (!code) {
    throw new Error("Spotify authorization did not return a code");
  }

  const tokenSet = await exchangeCodeForToken(code, transient.codeVerifier, redirectUri);
  await persistTokens(tokenSet);
}

// Returns a currently-valid access token, transparently refreshing if the stored
// one has expired. Throws if the user has never connected Spotify.
export async function getValidSpotifyAccessToken(): Promise<string> {
  const stored = await loadStoredTokens();
  if (!stored) {
    throw new Error("Not connected to Spotify — call startSpotifyAuth() first");
  }

  if (Date.now() < stored.expiresAt - EXPIRY_SAFETY_MARGIN_MS) {
    return stored.accessToken;
  }

  const refreshed = await refreshAccessToken(stored.refreshToken);
  await persistTokens(refreshed, stored.refreshToken);
  return refreshed.access_token;
}
