import { Plugin, QueryController, type ViewOption } from "obsidian";
import { DEFAULT_COLOR_SCHEMES, DEFAULT_SETTINGS } from "./settings";
import type { HeatmapPluginSettings } from "./types";
import { HeatmapView, HEATMAP_VIEW_TYPE } from "./view";
import { HeatmapSettingTab } from "./settings/settings-tab";

export default class HeatmapBasesViewPlugin extends Plugin {
  settings!: HeatmapPluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new HeatmapSettingTab(this.app, this));

    (this.app.workspace as unknown as {
      registerHoverLinkSource: (
        id: string,
        info: { display: string; defaultMod: boolean }
      ) => void;
    }).registerHoverLinkSource("heatmap-bases-view", {
      display: "Heatmap",
      defaultMod: true,
    });

    this.registerBasesView(HEATMAP_VIEW_TYPE, {
      name: "Heatmap",
      icon: "calendar-heat",
      factory: (controller: QueryController, containerEl: HTMLElement) =>
        new HeatmapView(controller, containerEl, this),
      options: (): ViewOption[] => [
        {
          type: "property",
          key: "dateProperty",
          displayName: "Date property",
          placeholder: "Use filename for daily notes",
        },
        {
          type: "property",
          key: "valueProperty",
          displayName: "Value property",
        },
        {
          type: "text",
          key: "startDate",
          displayName: "Start date",
          placeholder: "YYYY-MM-DD (leave empty for auto)",
        },
        {
          type: "text",
          key: "endDate",
          displayName: "End date",
          placeholder: "YYYY-MM-DD (leave empty for today)",
        },
        {
          type: "dropdown",
          key: "colorScheme",
          displayName: "Color scheme",
          default: "green",
          options: this.getColorSchemeOptions(),
        },
        {
          type: "dropdown",
          key: "weekStart",
          displayName: "Week starts on",
          default: "0",
          options: {
            "0": "Sunday",
            "1": "Monday",
          },
        },
        {
          type: "toggle",
          key: "showWeekdayLabels",
          displayName: "Show weekday labels",
          default: true,
        },
        {
          type: "toggle",
          key: "showMonthLabels",
          displayName: "Show month labels",
          default: true,
        },
        {
          type: "dropdown",
          key: "layoutDirection",
          displayName: "Layout direction",
          default: "horizontal",
          options: {
            horizontal: "Horizontal (GitHub-style)",
            vertical: "Vertical (calendar-style)",
          },
        },
        {
          type: "dropdown",
          key: "cellSize",
          displayName: "Cell size",
          default: "small",
          options: {
            small: "Small (11px)",
            medium: "Medium (16px)",
            large: "Large (24px)",
          },
        },
        {
          type: "text",
          key: "minValue",
          displayName: "Min value",
          placeholder: "Auto (based on data)",
        },
        {
          type: "text",
          key: "maxValue",
          displayName: "Max value",
          placeholder: "Auto (based on data)",
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
}
