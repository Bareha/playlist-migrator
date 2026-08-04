export interface ProgressViewProps {
  total: number;
  completed: number;
}

export function renderProgressView(container: HTMLElement, props: ProgressViewProps): void {
  container.innerHTML = "";

  const heading = document.createElement("h1");
  heading.textContent = "Migrating…";
  container.appendChild(heading);

  const progress = document.createElement("progress");
  progress.max = props.total;
  progress.value = props.completed;
  container.appendChild(progress);

  const label = document.createElement("p");
  label.textContent = `${props.completed} / ${props.total} tracks processed`;
  container.appendChild(label);
}
