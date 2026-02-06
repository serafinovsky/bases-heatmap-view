import { BasesEntry, BasesView, QueryController } from "obsidian";
import {
  type CellSizePreset,
  type ColorScheme,
  type HeatmapViewConfig,
  type LayoutDirection,
  type ProcessedData,
} from "../types";
import { calculateDateRange, detectValueType, processData } from "../utils";
import { getSchemeDefinition } from "../utils";
import { createEmptyState, renderHeatmap, type RenderOptions } from "./renderer";
import { setupInteractions } from "./interactions";
import type HeatmapBasesViewPlugin from "../main";
import { HEATMAP_VIEW_TYPE } from "./index";

export class HeatmapView extends BasesView {
  readonly type = HEATMAP_VIEW_TYPE;

  private containerEl: HTMLElement;
  private cleanupInteractions: (() => void) | null = null;
  private processedData: ProcessedData | null = null;

  constructor(
    controller: QueryController,
    parentEl: HTMLElement,
    private plugin: HeatmapBasesViewPlugin
  ) {
    super(controller);
    this.containerEl = parentEl.createDiv("heatmap-view-container");
  }

  private getConfig(): HeatmapViewConfig {
    const config = this.config;

    const minValueStr = config.get("minValue") as string;
    const maxValueStr = config.get("maxValue") as string;
    const minValue = minValueStr ? parseFloat(minValueStr) : null;
    const maxValue = maxValueStr ? parseFloat(maxValueStr) : null;

    return {
      dateProperty: (config.get("dateProperty") as string) || "__filename__",
      valueProperty: (config.get("valueProperty") as string) || "",
      startDate: (config.get("startDate") as string) || null,
      endDate: (config.get("endDate") as string) || null,
      colorScheme: (config.get("colorScheme") as ColorScheme) || "green",
      weekStart: parseInt((config.get("weekStart") as string) || "0", 10) as 0 | 1,
      showWeekdayLabels: config.get("showWeekdayLabels") !== false,
      showMonthLabels: config.get("showMonthLabels") !== false,
      layoutDirection:
        (config.get("layoutDirection") as LayoutDirection) || "horizontal",
      cellSize: (config.get("cellSize") as CellSizePreset) || "small",
      minValue: minValue !== null && !isNaN(minValue) ? minValue : null,
      maxValue: maxValue !== null && !isNaN(maxValue) ? maxValue : null,
    };
  }

  onDataUpdated(): void {
    this.render();
  }

  private render(): void {
    if (this.cleanupInteractions) {
      this.cleanupInteractions();
      this.cleanupInteractions = null;
    }

    this.containerEl.empty();

    const viewConfig = this.getConfig();

    if (!viewConfig.valueProperty) {
      const emptyState = createEmptyState(
        "Configure value property",
        "Select a property to visualize in the view settings."
      );
      this.containerEl.appendChild(emptyState);
      return;
    }

    const queryData = this.data;
    if (!queryData) {
      return;
    }

    const entries: BasesEntry[] = queryData.data || [];

    if (entries.length === 0) {
      const emptyState = createEmptyState(
        "No data to display",
        "No notes found in the current filter. Check your Base filters."
      );
      this.containerEl.appendChild(emptyState);
      return;
    }

    const valueType = detectValueType(
      entries,
      viewConfig.valueProperty,
      viewConfig.dateProperty
    );
    if (valueType === "unsupported") {
      const emptyState = createEmptyState(
        "Unsupported property type",
        `"${viewConfig.valueProperty}" is not a boolean or number property. Heatmap requires boolean or number properties.`
      );
      this.containerEl.appendChild(emptyState);
      return;
    }

    this.processedData = processData(
      entries,
      viewConfig.dateProperty,
      viewConfig.valueProperty
    );

    if (viewConfig.minValue !== null) {
      this.processedData.stats.min = viewConfig.minValue;
    }
    if (viewConfig.maxValue !== null) {
      this.processedData.stats.max = viewConfig.maxValue;
    }

    if (this.processedData.entries.size === 0) {
      const emptyState = createEmptyState(
        "No dated notes found",
        "No notes with valid dates were found. Check your date property setting."
      );
      this.containerEl.appendChild(emptyState);
      return;
    }

    const dateRange = calculateDateRange(
      this.processedData.entries,
      viewConfig.startDate,
      viewConfig.endDate
    );

    const schemeItem =
      this.plugin.settings.colorSchemes.find(s => s.id === viewConfig.colorScheme) ??
      this.plugin.settings.colorSchemes[0];
    const schemeDefinition = getSchemeDefinition(schemeItem);

    const renderOptions: RenderOptions = {
      schemeDefinition,
      weekStart: viewConfig.weekStart,
      showWeekdayLabels: viewConfig.showWeekdayLabels,
      showMonthLabels: viewConfig.showMonthLabels,
      layoutDirection: viewConfig.layoutDirection,
      cellSize: viewConfig.cellSize,
    };

    const heatmapEl = renderHeatmap(this.processedData, dateRange, renderOptions);
    this.containerEl.appendChild(heatmapEl);

    this.cleanupInteractions = setupInteractions({
      app: this.app,
      entries: this.processedData.entries,
      containerEl: heatmapEl,
      plugin: this.plugin,
      layoutDirection: viewConfig.layoutDirection,
    });
  }
}
