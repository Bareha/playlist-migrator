import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json" with { type: "json" };

// Public key for this extension's pinned ID (hpjaoeeafidabahejobfehgjleocjnkd).
// Pinning this keeps the ID stable across reloads, which the Spotify redirect
// URI and the Google OAuth "Chrome Extension" client are both registered against.
// This is a PUBLIC key (safe to commit) — the matching private key lives in
// extension/keys/extension_key.pem and is gitignored.
const EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqOORvowwh0+MRtS1aK4fO8EzMzRNrAVdlw73lcs6FYe9sGlZdwWEqj8ht1rzKt4tw2HnJzTIizTSCFTDFFqlkAOgQUFtksQA732zBlfbeV0ACeT7gjJ08GDTmu9bJZsNDUJcFI30AJZ/FeMS3AaBLKVhLiVttDUuOTNC3tBP1CPiLJSy1gnhzsNQsUvV+vCj8UhdGK0rFkS3447/wwwQjRueMi5JnS4twq20GLHZYvYo77wu4DYxZ0npmOA016eqiMJN2YWUEEwfGXPoQYqB66l6PUsUhx/XMA5p8fT83noWjJY+NEfSJx9kc/ywEnnBPeYtOL+ooT2EoXbRjHAzvQIDAQAB";

const GOOGLE_OAUTH_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";

export default defineManifest({
  manifest_version: 3,
  name: "Playlist Migrator",
  description: "Migrate a Spotify playlist to a new private YouTube playlist.",
  version: pkg.version,
  key: EXTENSION_PUBLIC_KEY,
  // TODO(Stage 5): add real icons under public/icons and reference them here.
  action: {
    default_popup: "src/popup/popup.html",
  },
  background: {
    service_worker: "src/background/service-worker.ts",
    type: "module",
  },
  permissions: ["identity", "storage", "alarms"],
  host_permissions: [
    "https://api.spotify.com/*",
    "https://accounts.spotify.com/*",
    "https://www.googleapis.com/*",
  ],
  oauth2: {
    client_id: GOOGLE_OAUTH_CLIENT_ID,
    scopes: ["https://www.googleapis.com/auth/youtube.force-ssl"],
  },
});
