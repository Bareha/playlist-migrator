import type { MigrationPreparation } from "../../migration/orchestrator";

export interface FormViewProps {
  spotifyConnected: boolean;
  youtubeConnected: boolean;
  preparation?: MigrationPreparation | null;
  onConnectSpotify: () => void;
  onConnectYoutube: () => void;
  onPrepare: (playlistId: string) => void;
  onStart?: () => void;
}

export function renderFormView(container: HTMLElement, props: FormViewProps): void {
  container.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "Playlist Migrator";
  container.appendChild(heading);

  const authRow = document.createElement("div");
  authRow.className = "auth-row";

  const spotifyButton = document.createElement("button");
  spotifyButton.textContent = props.spotifyConnected ? "Spotify connected" : "Connect Spotify";
  spotifyButton.disabled = props.spotifyConnected;
  spotifyButton.addEventListener("click", props.onConnectSpotify);
  authRow.appendChild(spotifyButton);

  const youtubeButton = document.createElement("button");
  youtubeButton.textContent = props.youtubeConnected ? "YouTube connected" : "Connect YouTube";
  youtubeButton.disabled = props.youtubeConnected;
  youtubeButton.addEventListener("click", props.onConnectYoutube);
  authRow.appendChild(youtubeButton);

  container.appendChild(authRow);

  const form = document.createElement("form");

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Spotify playlist URL or ID";
  input.required = true;
  form.appendChild(input);

  const prepareButton = document.createElement("button");
  prepareButton.type = "submit";
  prepareButton.textContent = "Preview";
  prepareButton.disabled = !props.spotifyConnected;
  form.appendChild(prepareButton);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const playlistId = extractPlaylistId(input.value.trim());
    if (playlistId) {
      props.onPrepare(playlistId);
    }
  });

  container.appendChild(form);

  if (props.preparation) {
    container.appendChild(buildPreview(props.preparation));

    const startButton = document.createElement("button");
    startButton.textContent = "Start migration";
    startButton.disabled = !props.youtubeConnected;
    startButton.addEventListener("click", () => props.onStart?.());
    container.appendChild(startButton);
  }
}

function buildPreview(preparation: MigrationPreparation): HTMLElement {
  const preview = document.createElement("div");
  preview.className = "preview";

  const title = document.createElement("p");
  const titleStrong = document.createElement("strong");
  titleStrong.textContent = preparation.playlistName;
  title.appendChild(titleStrong);
  preview.appendChild(title);

  const counts = document.createElement("p");
  counts.textContent = `${preparation.queries.length} tracks matched, ${preparation.skippedCount} skipped (missing metadata).`;
  preview.appendChild(counts);

  const quota = document.createElement("p");
  quota.textContent = `Estimated YouTube quota: ${preparation.quota.estimatedUnits} units (default daily cap: 10,000).`;
  preview.appendChild(quota);

  if (preparation.quota.exceedsDefaultDailyCap) {
    const warning = document.createElement("p");
    warning.className = "warning";
    warning.textContent = "This may exceed your daily quota and fail partway through.";
    preview.appendChild(warning);
  }

  if (preparation.sampleSkippedItem) {
    const diagnosticLabel = document.createElement("p");
    diagnosticLabel.className = "warning";
    diagnosticLabel.textContent = "Every track was skipped — sample raw item for diagnosis:";
    preview.appendChild(diagnosticLabel);

    const diagnosticSample = document.createElement("pre");
    diagnosticSample.className = "diagnostic";
    diagnosticSample.textContent = preparation.sampleSkippedItem;
    preview.appendChild(diagnosticSample);
  }

  return preview;
}

// Accepts a bare playlist ID or a full open.spotify.com/playlist/<id> URL.
function extractPlaylistId(input: string): string | null {
  if (!input) {
    return null;
  }
  const match = input.match(/playlist\/([a-zA-Z0-9]+)/);
  if (match) {
    return match[1];
  }
  return /^[a-zA-Z0-9]+$/.test(input) ? input : null;
}
