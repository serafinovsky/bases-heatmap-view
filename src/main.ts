import { Plugin, QueryController, type ViewOption } from "obsidian";
import { initI18n, t } from "./i18n";
import { getDefaultDateStrings } from "./utils";
import { DEFAULT_COLOR_SCHEMES, DEFAULT_SETTINGS, HeatmapSettingTab } from "./settings";
import type { HeatmapPluginSettings } from "./types";
import { HeatmapView, HEATMAP_VIEW_TYPE } from "./view";

export default class HeatmapBasesViewPlugin extends Plugin {
  settings!: HeatmapPluginSettings;
  private activeViews: HeatmapView[] = [];

  async onload() {
    await initI18n("en");
    await this.loadSettings();

    this.addSettingTab(new HeatmapSettingTab(this.app, this));

    (
      this.app.workspace as unknown as {
        registerHoverLinkSource: (
          id: string,
          info: { display: string; defaultMod: boolean }
        ) => void;
      }
    ).registerHoverLinkSource("heatmap-bases-view", {
      display: t("view.options.displayName"),
      defaultMod: true,
    });

    this.registerEvent(this.app.workspace.on("css-change", () => this.refreshAllViews()));

    this.registerBasesView(HEATMAP_VIEW_TYPE, {
      name: t("view.options.displayName"),
      icon: "calendar-heat",
      factory: (controller: QueryController, containerEl: HTMLElement) =>
        new HeatmapView(controller, containerEl, this),
      options: (): ViewOption[] => [
        {
          type: "property",
          key: "dateProperty",
          displayName: t("view.options.dateProperty"),
          placeholder: t("view.options.datePropertyPlaceholder"),
        },
        {
          type: "property",
          key: "valueProperty",
          displayName: t("view.options.valueProperty"),
        },
        {
          type: "text",
          key: "startDate",
          displayName: t("view.options.startDate"),
          placeholder: t("view.options.startDatePlaceholder"),
          default: getDefaultDateStrings().startDate,
        },
        {
          type: "text",
          key: "endDate",
          displayName: t("view.options.endDate"),
          placeholder: t("view.options.endDatePlaceholder"),
          default: getDefaultDateStrings().endDate,
        },
        {
          type: "dropdown",
          key: "colorScheme",
          displayName: t("view.options.colorScheme"),
          default: "green",
          options: this.getColorSchemeOptions(),
        },
        {
          type: "dropdown",
          key: "weekStart",
          displayName: t("view.options.weekStart"),
          default: "0",
          options: {
            "0": t("view.options.sunday"),
            "1": t("view.options.monday"),
          },
        },
        {
          type: "toggle",
          key: "showWeekdayLabels",
          displayName: t("view.options.showWeekdayLabels"),
          default: true,
        },
        {
          type: "toggle",
          key: "showMonthLabels",
          displayName: t("view.options.showMonthLabels"),
          default: true,
        },
        {
          type: "dropdown",
          key: "cellSize",
          displayName: t("view.options.cellSize"),
          default: "small",
          options: {
            small: t("view.options.small"),
            medium: t("view.options.medium"),
            large: t("view.options.large"),
          },
        },
        {
          type: "text",
          key: "minValue",
          displayName: t("view.options.minValue"),
          placeholder: t("view.options.minValuePlaceholder"),
        },
        {
          type: "text",
          key: "maxValue",
          displayName: t("view.options.maxValue"),
          placeholder: t("view.options.maxValuePlaceholder"),
        },
      ],
    });
  }

  async loadSettings() {
    const loaded = (await this.loadData()) as HeatmapPluginSettings | null;
    this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
    if (!this.settings.colorSchemes || this.settings.colorSchemes.length === 0) {
      this.settings.colorSchemes = DEFAULT_COLOR_SCHEMES;
    }
    if (!this.settings.dateFormat) {
      this.settings.dateFormat = DEFAULT_SETTINGS.dateFormat;
    }
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  getColorSchemeOptions(): Record<string, string> {
    const options: Record<string, string> = {};
    for (const scheme of this.settings.colorSchemes) {
      options[scheme.id] = scheme.name;
    }
    return options;
  }

  registerHeatmapView(view: HeatmapView): void {
    if (!this.activeViews.includes(view)) {
      this.activeViews.push(view);
    }
  }

  unregisterHeatmapView(view: HeatmapView): void {
    const i = this.activeViews.indexOf(view);
    if (i !== -1) this.activeViews.splice(i, 1);
  }

  refreshAllViews(): void {
    for (const view of this.activeViews) {
      view.refresh();
    }
  }
}
