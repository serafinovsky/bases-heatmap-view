import type { BasesPropertyId, TFile } from "obsidian";

export interface HeatmapEntry {
  date: string;
  value: number | null;
  note: TFile;
  displayValue: string;
}

export type ValueType = "boolean" | "number" | "unsupported";

export interface ProcessedData {
  entries: Map<string, HeatmapEntry>;
  stats: {
    min: number;
    max: number;
    count: number;
    valueType: ValueType;
  };
}

export interface HeatmapViewConfig {
  dateProperty: BasesPropertyId | null;
  valueProperty: BasesPropertyId | null;
  startDate: string | null;
  endDate: string | null;
  colorScheme: ColorScheme;
  weekStart: 0 | 1;
  showWeekdayLabels: boolean;
  showMonthLabels: boolean;
  cellSize: CellSizePreset;
  minValue: number | null;
  maxValue: number | null;
}

export type ColorScheme = string;

export type CellSizePreset = "small" | "medium" | "large";

export const CELL_SIZE_VALUES: Record<CellSizePreset, number> = {
  small: 11,
  medium: 16,
  large: 24,
};

export interface ColorSchemeItem {
  id: string;
  name: string;
  zeroColor: string;
  maxColor: string;
  isDefault?: boolean;
}

export type CellState =
  | { type: "empty" }
  | { type: "zero"; note: TFile }
  | { type: "filled"; note: TFile; intensity: number };

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MonthLabel {
  name: string;
  startColumn: number;
  endColumn: number;
}

export interface HeatmapPluginSettings {
  colorSchemes: ColorSchemeItem[];
  dateFormat: string;
}
