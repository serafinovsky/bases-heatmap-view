import { App, setTooltip } from "obsidian";
import type { HeatmapEntry, LayoutDirection } from "../types";
import { formatDateDisplay, parseISODateString } from "../utils";
import type HeatmapBasesViewPlugin from "../main";

export interface InteractionHandlerOptions {
  app: App;
  entries: Map<string, HeatmapEntry>;
  containerEl: HTMLElement;
  plugin: HeatmapBasesViewPlugin;
  layoutDirection?: LayoutDirection;
}

export function setupInteractions(options: InteractionHandlerOptions): () => void {
  const {
    app,
    entries,
    containerEl,
    plugin,
    layoutDirection = "horizontal",
  } = options;

  const cleanupFns: (() => void)[] = [];

  const clickHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const cell = target.closest(".heatmap-cell");

    if (!(cell instanceof HTMLElement)) return;

    const notePath = cell.dataset.notePath;
    if (notePath) {
      void app.workspace.openLinkText(notePath, "", false);
    }
  };

  containerEl.addEventListener("click", clickHandler);
  cleanupFns.push(() => containerEl.removeEventListener("click", clickHandler));

  const mouseoverHandler = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const cell = target.closest(".heatmap-cell");

    if (!(cell instanceof HTMLElement)) return;

    const dateStr = cell.dataset.date;
    if (!dateStr) return;

    const notePath = cell.dataset.notePath;
    if (notePath && (event.ctrlKey || event.metaKey)) {
      app.workspace.trigger("hover-link", {
        event,
        source: "heatmap-bases-view",
        hoverParent: containerEl,
        targetEl: cell,
        linktext: notePath,
        sourcePath: "",
      });
    }

    const tooltipContent = buildTooltipContent(
      dateStr,
      entries.get(dateStr),
      cell,
      plugin
    );
    setTooltip(cell, tooltipContent, { placement: "top" });
  };

  containerEl.addEventListener("mouseover", mouseoverHandler);
  cleanupFns.push(() => containerEl.removeEventListener("mouseover", mouseoverHandler));

  const keydownHandler = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const cell = target.closest(".heatmap-cell");

    if (!(cell instanceof HTMLElement)) return;

    const dateStr = cell.dataset.date;
    if (!dateStr) return;

    if (event.key === "Enter") {
      const notePath = cell.dataset.notePath;
      if (notePath) {
        void app.workspace.openLinkText(notePath, "", false);
      }
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      navigateToAdjacentCell(cell, event.key, containerEl, layoutDirection);
    }
  };

  containerEl.addEventListener("keydown", keydownHandler);
  cleanupFns.push(() => containerEl.removeEventListener("keydown", keydownHandler));

  const cells = containerEl.querySelectorAll(".heatmap-cell");
  cells.forEach(cell => {
    (cell as HTMLElement).tabIndex = 0;
  });

  return () => {
    cleanupFns.forEach(fn => fn());
  };
}

function buildTooltipContent(
  dateStr: string,
  entry: HeatmapEntry | undefined,
  cell: HTMLElement,
  plugin: HeatmapBasesViewPlugin
): string {
  const formattedDate = formatDateDisplay(dateStr);

  if (!entry) {
    return `${formattedDate}\nNo note`;
  }

  const displayValue = cell.dataset.displayValue || entry.displayValue;
  return `${formattedDate}\n${displayValue}`;
}

function navigateToAdjacentCell(
  currentCell: HTMLElement,
  key: string,
  containerEl: HTMLElement,
  layoutDirection: LayoutDirection
): void {
  const currentDate = currentCell.dataset.date;
  if (!currentDate) return;

  const date = parseISODateString(currentDate) ?? new Date(currentDate);
  if (isNaN(date.getTime())) return;
  let dayOffset = 0;
  const isVertical = layoutDirection === "vertical";

  switch (key) {
    case "ArrowUp":
      dayOffset = isVertical ? -7 : -1;
      break;
    case "ArrowDown":
      dayOffset = isVertical ? 7 : 1;
      break;
    case "ArrowLeft":
      dayOffset = isVertical ? -1 : -7;
      break;
    case "ArrowRight":
      dayOffset = isVertical ? 1 : 7;
      break;
    default:
      return;
  }

  const targetDate = new Date(date);
  targetDate.setDate(date.getDate() + dayOffset);

  const targetDateStr = formatDateISO(targetDate);
  const targetCell = containerEl.querySelector(
    `.heatmap-cell[data-date="${targetDateStr}"]`
  );

  if (targetCell instanceof HTMLElement) {
    targetCell.focus();
  }
}

function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
