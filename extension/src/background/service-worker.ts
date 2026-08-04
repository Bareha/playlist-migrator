import { isSpotifyConnected, startSpotifyAuth } from "../spotify/auth";
import { getYoutubeAccessToken, isYoutubeConnected } from "../youtube/auth";
import { prepareMigration, resumeMigration, startMigration } from "../migration/orchestrator";
import { loadMigrationState } from "../migration/state";
import type { BackgroundToPopupMessage, PopupToBackgroundMessage } from "../migration/messages";

// chrome.alarms is the one MV3 mechanism that can wake an already-terminated service
// worker (unlike setTimeout/setInterval, which die with the worker) — this is what makes
// migration resumption correct even if the popup is never reopened after a worker kill.
// Chrome throttles repeating alarms to roughly a 1-minute floor.
const RESUME_ALARM_NAME = "migration-resume-check";

chrome.alarms.create(RESUME_ALARM_NAME, { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RESUME_ALARM_NAME) {
    resumeMigration().catch((error: unknown) => {
      console.error("Failed to resume migration", error);
    });
  }
});

// Also try resuming right when the worker (re)starts, so a killed/restarted worker
// doesn't have to wait for the next alarm tick if one is already overdue.
resumeMigration().catch((error: unknown) => {
  console.error("Failed to resume migration on startup", error);
});

// All chrome-API side effects (auth, migration) are centralized here rather than in the
// popup, so they keep working via the alarm above even while the popup is closed. The
// popup only ever sends messages over this port and renders whatever comes back.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== "popup") {
    return;
  }

  const send = (message: BackgroundToPopupMessage) => port.postMessage(message);

  port.onMessage.addListener((message: PopupToBackgroundMessage) => {
    handleMessage(message, send).catch((error: unknown) => {
      send({ type: "MIGRATION_ERROR", message: error instanceof Error ? error.message : String(error) });
    });
  });
});

async function handleMessage(
  message: PopupToBackgroundMessage,
  send: (message: BackgroundToPopupMessage) => void,
): Promise<void> {
  switch (message.type) {
    case "GET_AUTH_STATUS": {
      const [spotifyConnected, youtubeConnected] = await Promise.all([
        isSpotifyConnected(),
        isYoutubeConnected(),
      ]);
      send({ type: "AUTH_STATUS", spotifyConnected, youtubeConnected });
      return;
    }
    case "CONNECT_SPOTIFY": {
      await startSpotifyAuth();
      send({ type: "AUTH_STATUS", spotifyConnected: true, youtubeConnected: await isYoutubeConnected() });
      return;
    }
    case "CONNECT_YOUTUBE": {
      await getYoutubeAccessToken(true);
      send({ type: "AUTH_STATUS", spotifyConnected: await isSpotifyConnected(), youtubeConnected: true });
      return;
    }
    case "PREPARE_MIGRATION": {
      const preparation = await prepareMigration(message.spotifyPlaylistId);
      send({ type: "MIGRATION_PREPARED", preparation });
      return;
    }
    case "START_MIGRATION": {
      const finalState = await startMigration(
        message.spotifyPlaylistId,
        message.playlistName,
        message.queries,
        (state) => send({ type: "PROGRESS_UPDATE", state }),
      );
      send({ type: "MIGRATION_COMPLETE", state: finalState });
      return;
    }
    case "GET_STATE": {
      const state = await loadMigrationState();
      send({ type: "STATE", state });
      return;
    }
  }
}
