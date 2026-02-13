import { BasesEntry, BasesView, QueryController } from "obsidian";
import { t } from "../i18n";
import {
  type CellSizePreset,
  type ColorScheme,
  type HeatmapViewConfig,
  type ProcessedData,
} from "../types";
import {
  calculateDateRange,
  getDefaultDateStrings,
  parseISODateString,
  processData,
} from "../utils";
import { getSchemeDefinition } from "../utils";
import { createEmptyState, renderHeatmap, type RenderOptions } from "./renderer";
import { setupInteractions } from "./interactions";
import type HeatmapBasesViewPlugin from "../main";
import { HEATMAP_VIEW_TYPE } from "./index";

const MAX_RANGE_DAYS = 5 * 365;

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
    this.plugin.registerHeatmapView(this);
  }

  override onunload(): void {
    this.plugin.unregisterHeatmapView(this);
    super.onunload();
  }

  refresh(): void {
    if (!this.containerEl.isConnected) return;
    this.render();
  }

  private parseNumericValue(value: string | undefined): number | null {
    if (!value) return null;
    const parsed = parseFloat(value);
    return !isNaN(parsed) ? parsed : null;
  }

  private getConfig(): HeatmapViewConfig {
    const { config } = this;
    const defaults = getDefaultDateStrings();

    return {
      dateProperty: config.getAsPropertyId("dateProperty"),
      valueProperty: config.getAsPropertyId("valueProperty"),
      startDate: (config.get("startDate") as string) || defaults.startDate,
      endDate: (config.get("endDate") as string) || defaults.endDate,
      colorScheme: (config.get("colorScheme") as ColorScheme) || "green",
      weekStart: parseInt((config.get("weekStart") as string) || "0", 10) as 0 | 1,
      showWeekdayLabels: config.get("showWeekdayLabels") !== false,
      showMonthLabels: config.get("showMonthLabels") !== false,
      cellSize: (config.get("cellSize") as CellSizePreset) || "small",
      minValue: this.parseNumericValue(config.get("minValue") as string),
      maxValue: this.parseNumericValue(config.get("maxValue") as string),
    };
  }

  onDataUpdated(): void {
    this.render();
  }

  private showEmptyState(title: string, description: string): void {
    this.containerEl.appendChild(createEmptyState(title, description));
  }

  private validateData(viewConfig: HeatmapViewConfig): BasesEntry[] | null {
    if (!viewConfig.valueProperty) {
      this.showEmptyState(
        t("view.emptyState.configureProperty"),
        t("view.emptyState.configurePropertyDesc")
      );
      return null;
    }

    if (viewConfig.startDate && viewConfig.endDate) {
      const start = parseISODateString(viewConfig.startDate);
      const end = parseISODateString(viewConfig.endDate);
      if (!start || !end) {
        this.showEmptyState(
          t("view.emptyState.invalidDateFormat"),
          t("view.emptyState.invalidDateFormatDesc")
        );
        return null;
      }
      if (start.getTime() >= end.getTime()) {
        this.showEmptyState(
          t("view.emptyState.startAfterEnd"),
          t("view.emptyState.startAfterEndDesc")
        );
        return null;
      }
    }

    if (!this.data) return null;

    const entries: BasesEntry[] = this.data.data || [];

    if (entries.length === 0) {
      this.showEmptyState(t("view.emptyState.noData"), t("view.emptyState.noDataDesc"));
      return null;
    }

    return entries;
  }

  private render(): void {
    this.cleanupInteractions?.();
    this.cleanupInteractions = null;
    this.containerEl.empty();

    const viewConfig = this.getConfig();
    const entries = this.validateData(viewConfig);
    if (!entries || !viewConfig.valueProperty) return;

    this.processedData = processData(
      entries,
      viewConfig.dateProperty,
      this.plugin.settings.dateFormat,
      viewConfig.valueProperty
    );

    if (this.processedData.stats.valueType === "unsupported") {
      this.showEmptyState(
        t("view.emptyState.unsupportedProperty"),
        t("view.emptyState.unsupportedPropertyDesc", { property: `"${viewConfig.valueProperty}"` })
      );
      return;
    }

    // Apply custom min/max values if configured
    if (viewConfig.minValue !== null) this.processedData.stats.min = viewConfig.minValue;
    if (viewConfig.maxValue !== null) this.processedData.stats.max = viewConfig.maxValue;

    if (this.processedData.entries.size === 0) {
      this.showEmptyState(t("view.emptyState.noDatedNotes"), t("view.emptyState.noDatedNotesDesc"));
      return;
    }

    const dateRange = calculateDateRange(
      this.processedData.entries,
      viewConfig.startDate,
      viewConfig.endDate
    );

    const diffMs = dateRange.end.getTime() - dateRange.start.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays > MAX_RANGE_DAYS) {
      this.showEmptyState(
        t("view.emptyState.rangeTooLarge"),
        t("view.emptyState.rangeTooLargeDesc")
      );
      return;
    }

    const schemeItem =
      this.plugin.settings.colorSchemes.find((s) => s.id === viewConfig.colorScheme) ??
      this.plugin.settings.colorSchemes[0];

    const renderOptions: RenderOptions = {
      schemeDefinition: getSchemeDefinition(schemeItem),
      isDark: this.app.isDarkMode(),
      weekStart: viewConfig.weekStart,
      showWeekdayLabels: viewConfig.showWeekdayLabels,
      showMonthLabels: viewConfig.showMonthLabels,
      cellSize: viewConfig.cellSize,
    };

    const heatmapEl = renderHeatmap(this.processedData, dateRange, renderOptions);
    this.containerEl.appendChild(heatmapEl);

    this.cleanupInteractions = setupInteractions({
      app: this.app,
      entries: this.processedData.entries,
      containerEl: heatmapEl,
    });
  }
}
