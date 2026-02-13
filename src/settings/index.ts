import type { ColorSchemeItem, HeatmapPluginSettings } from "../types";

export const DEFAULT_COLOR_SCHEMES: ColorSchemeItem[] = [
  {
    id: "green",
    name: "Green",
    zeroColor: "#ebedf0",
    maxColor: "#39d353",
    isDefault: true,
  },
  {
    id: "purple",
    name: "Purple",
    zeroColor: "#ebedf0",
    maxColor: "#a78bfa",
    isDefault: true,
  },
  {
    id: "blue",
    name: "Blue",
    zeroColor: "#ebedf0",
    maxColor: "#38bdf8",
    isDefault: true,
  },
  {
    id: "orange",
    name: "Orange",
    zeroColor: "#ebedf0",
    maxColor: "#fb923c",
    isDefault: true,
  },
  {
    id: "gray",
    name: "Gray",
    zeroColor: "#ebedf0",
    maxColor: "#adbac7",
    isDefault: true,
  },
];

export const DEFAULT_SETTINGS: HeatmapPluginSettings = {
  colorSchemes: DEFAULT_COLOR_SCHEMES,
  dateFormat: "YYYY-MM-DD",
};

export { HeatmapSettingTab } from "./HeatmapSettingTab";
export { EditSchemeModal } from "./EditSchemeModal";
export * from "./utils";
