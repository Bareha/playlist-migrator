import type { MigrationState } from "../../migration/state";

export function renderResultsView(container: HTMLElement, state: MigrationState): void {
  container.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "Migration complete";
  container.appendChild(heading);

  const matched = state.results.filter((result) => result.videoId !== null);
  const skipped = state.results.filter((result) => result.videoId === null);

  const summary = document.createElement("p");
  summary.textContent = `${matched.length} of ${state.results.length} tracks added to "${state.playlistName}".`;
  container.appendChild(summary);

  if (skipped.length > 0) {
    const skippedHeading = document.createElement("p");
    skippedHeading.textContent = "No YouTube match found for:";
    container.appendChild(skippedHeading);

    const list = document.createElement("ul");
    for (const result of skipped) {
      const item = document.createElement("li");
      item.textContent = result.query;
      list.appendChild(item);
    }
    container.appendChild(list);
  }
}
