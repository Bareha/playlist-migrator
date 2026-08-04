import "./popup.css";
import type { BackgroundToPopupMessage, PopupToBackgroundMessage } from "../migration/messages";
import type { MigrationPreparation } from "../migration/orchestrator";
import { renderFormView } from "./views/formView";
import { renderProgressView } from "./views/progressView";
import { renderResultsView } from "./views/resultsView";

const appElOrNull = document.getElementById("app");
if (!appElOrNull) {
  throw new Error("popup.html is missing #app");
}
const appEl: HTMLElement = appElOrNull;

const port = chrome.runtime.connect({ name: "popup" });

function send(message: PopupToBackgroundMessage): void {
  port.postMessage(message);
}

let currentPreparation: MigrationPreparation | null = null;
let currentSpotifyPlaylistId = "";

function showForm(authStatus: { spotifyConnected: boolean; youtubeConnected: boolean }): void {
  renderFormView(appEl, {
    spotifyConnected: authStatus.spotifyConnected,
    youtubeConnected: authStatus.youtubeConnected,
    preparation: currentPreparation,
    onConnectSpotify: () => send({ type: "CONNECT_SPOTIFY" }),
    onConnectYoutube: () => send({ type: "CONNECT_YOUTUBE" }),
    onPrepare: (playlistId) => {
      currentSpotifyPlaylistId = playlistId;
      send({ type: "PREPARE_MIGRATION", spotifyPlaylistId: playlistId });
    },
    onStart: () => {
      if (!currentPreparation) {
        return;
      }
      send({
        type: "START_MIGRATION",
        spotifyPlaylistId: currentSpotifyPlaylistId,
        playlistName: currentPreparation.playlistName,
        queries: currentPreparation.queries,
      });
      renderProgressView(appEl, { total: currentPreparation.queries.length, completed: 0 });
    },
  });
}

port.onMessage.addListener((message: BackgroundToPopupMessage) => {
  switch (message.type) {
    case "AUTH_STATUS":
      showForm(message);
      break;

    case "MIGRATION_PREPARED":
      currentPreparation = message.preparation;
      send({ type: "GET_AUTH_STATUS" });
      break;

    case "PROGRESS_UPDATE":
      renderProgressView(appEl, {
        total: message.state.queries.length,
        completed: message.state.currentIndex,
      });
      break;

    case "MIGRATION_COMPLETE":
      renderResultsView(appEl, message.state);
      break;

    case "MIGRATION_ERROR": {
      const errorEl = document.createElement("p");
      errorEl.className = "error";
      errorEl.textContent = message.message;
      appEl.innerHTML = "";
      appEl.appendChild(errorEl);
      break;
    }

    case "STATE":
      if (message.state?.status === "in-progress") {
        renderProgressView(appEl, {
          total: message.state.queries.length,
          completed: message.state.currentIndex,
        });
      } else if (message.state?.status === "complete") {
        renderResultsView(appEl, message.state);
      } else {
        send({ type: "GET_AUTH_STATUS" });
      }
      break;
  }
});

// On open, check whether there's an in-progress/complete migration to rehydrate
// (e.g. the popup was closed mid-migration and reopened) before falling back to the form.
send({ type: "GET_STATE" });
