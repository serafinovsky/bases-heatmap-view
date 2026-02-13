import { App, setTooltip } from "obsidian";
import { t } from "../i18n";
import type { HeatmapEntry } from "../types";
import { formatDateDisplay } from "../utils";

export interface InteractionHandlerOptions {
  app: App;
  entries: Map<string, HeatmapEntry>;
  containerEl: HTMLElement;
}

export function setupInteractions(options: InteractionHandlerOptions): () => void {
  const { app, entries, containerEl } = options;

  const getCell = (event: MouseEvent): HTMLElement | null => {
    const cell = (event.target as HTMLElement).closest(".heatmap-cell");
    return cell instanceof HTMLElement ? cell : null;
  };

  const clickHandler = (event: MouseEvent) => {
    const cell = getCell(event);
    if (!cell?.dataset.notePath) return;

    void app.workspace.openLinkText(cell.dataset.notePath, "", false);
  };

  const mouseoverHandler = (event: MouseEvent) => {
    const cell = getCell(event);
    if (!cell?.dataset.date) return;

    const { notePath, date: dateStr } = cell.dataset;

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

    const entry = entries.get(dateStr);
    const formattedDate = formatDateDisplay(dateStr);
    const value = entry ? cell.dataset.displayValue || entry.displayValue : t("view.noNote");

    setTooltip(cell, `${formattedDate}\n${value}`, { placement: "top" });
  };

  containerEl.addEventListener("click", clickHandler);
  containerEl.addEventListener("mouseover", mouseoverHandler);

  return () => {
    containerEl.removeEventListener("click", clickHandler);
    containerEl.removeEventListener("mouseover", mouseoverHandler);
  };
}
