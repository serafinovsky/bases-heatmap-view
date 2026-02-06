import {
  BasesEntry,
  BasesPropertyId,
  BooleanValue,
  DateValue,
  NullValue,
  NumberValue,
  StringValue,
} from "obsidian";
import { HeatmapEntry, ProcessedData } from "../types";
import {
  formatDateISO,
  parseDateFromFilename,
  parseISODateString,
} from "./dateUtils";

export type ValueType = "boolean" | "number" | "unsupported";

function toPropertyId(propertyName: string): BasesPropertyId {
  if (propertyName.includes(".")) {
    return propertyName as BasesPropertyId;
  }
  return `frontmatter.${propertyName}` as BasesPropertyId;
}

export function extractDate(
  entry: BasesEntry,
  dateProperty: string
): string | null {
  if (dateProperty === "__filename__" || !dateProperty) {
    try {
      const parsed = parseDateFromFilename(entry.file.basename);
      if (!parsed) {
        console.warn(
          `Failed to parse date from filename: "${entry.file.basename}"`,
          { file: entry.file.path }
        );
        return null;
      }
      return formatDateISO(parsed);
    } catch (error) {
      console.warn(
        `Error parsing date from filename: "${entry.file.basename}"`,
        { file: entry.file.path, error: String(error) }
      );
      return null;
    }
  }

  const propId = toPropertyId(dateProperty);
  const value = entry.getValue(propId);

  if (value === null || value instanceof NullValue) {
    return null;
  }

  try {
    if (value instanceof DateValue) {
      const dateStr = value.toString();
      const parsed = parseISODateString(dateStr) ?? new Date(dateStr);
      if (isNaN(parsed.getTime())) {
        console.warn(
          `Invalid date in property "${dateProperty}": "${dateStr}"`,
          { file: entry.file.path, property: dateProperty }
        );
        return null;
      }
      return formatDateISO(parsed);
    }

    const strValue = value.toString();
    const parsed = parseISODateString(strValue) ?? new Date(strValue);
    if (isNaN(parsed.getTime())) {
      console.warn(
        `Invalid date in property "${dateProperty}": "${strValue}"`,
        { file: entry.file.path, property: dateProperty }
      );
      return null;
    }
    return formatDateISO(parsed);
  } catch (error) {
    console.warn(`Error parsing date from property "${dateProperty}"`, {
      file: entry.file.path,
      property: dateProperty,
      error: String(error),
    });
    return null;
  }
}

export function extractValue(
  entry: BasesEntry,
  valueProperty: string
): { value: number | null; displayValue: string; type: ValueType } {
  const propId = toPropertyId(valueProperty);
  const obsidianValue = entry.getValue(propId);

  if (obsidianValue === null || obsidianValue instanceof NullValue) {
    return {
      value: null,
      displayValue: `${valueProperty}: not set`,
      type: "unsupported",
    };
  }

  if (obsidianValue instanceof BooleanValue) {
    const boolVal = obsidianValue.isTruthy();
    return {
      value: boolVal ? 1 : 0,
      displayValue: boolVal ? "Yes" : "No",
      type: "boolean",
    };
  }

  if (obsidianValue instanceof NumberValue) {
    const numVal = Number(obsidianValue.toString());
    if (isNaN(numVal)) {
      return {
        value: null,
        displayValue: obsidianValue.toString(),
        type: "unsupported",
      };
    }
    return {
      value: numVal,
      displayValue: String(numVal),
      type: "number",
    };
  }

  if (obsidianValue instanceof StringValue) {
    const strVal = obsidianValue.toString();

    const num = parseFloat(strVal);
    if (!isNaN(num)) {
      return {
        value: num,
        displayValue: strVal,
        type: "number",
      };
    }

    const lower = strVal.toLowerCase();
    if (lower === "true" || lower === "yes") {
      return { value: 1, displayValue: "Yes", type: "boolean" };
    }
    if (lower === "false" || lower === "no") {
      return { value: 0, displayValue: "No", type: "boolean" };
    }

    return {
      value: null,
      displayValue: strVal,
      type: "unsupported",
    };
  }

  const isTruthy = obsidianValue.isTruthy();
  return {
    value: isTruthy ? 1 : 0,
    displayValue: obsidianValue.toString(),
    type: "boolean",
  };
}

export function processData(
  entries: BasesEntry[],
  dateProperty: string,
  valueProperty: string
): ProcessedData {
  const heatmapEntries = new Map<string, HeatmapEntry>();
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  let hasNumeric = false;
  let skippedEntries = 0;

  for (const entry of entries) {
    const date = extractDate(entry, dateProperty);
    if (!date) {
      skippedEntries++;
      continue;
    }

    const { value, displayValue, type } = extractValue(entry, valueProperty);

    if (type === "number" && value !== null && value !== 0 && value !== 1) {
      hasNumeric = true;
    }

    if (value !== null) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      count++;
    }

    const existing = heatmapEntries.get(date);
    if (existing) {
      if (value !== null && (existing.value === null || value > existing.value)) {
        heatmapEntries.set(date, { date, value, note: entry.file, displayValue });
      }
    } else {
      heatmapEntries.set(date, { date, value, note: entry.file, displayValue });
    }
  }

  if (min === Infinity) min = 0;
  if (max === -Infinity) max = 1;
  if (min === max && min > 0) {
    min = 0;
  }

  if (skippedEntries > 0) {
    console.warn(
      `Data processing summary: ${skippedEntries} entries skipped due to invalid dates.`,
      {
        totalEntries: entries.length,
        skippedEntries,
        successfulEntries: heatmapEntries.size,
        dateProperty,
      }
    );
  }

  return {
    entries: heatmapEntries,
    stats: {
      min,
      max,
      count,
      hasNumeric,
    },
  };
}

export function detectValueType(
  entries: BasesEntry[],
  valueProperty: string,
  dateProperty: string
): ValueType {
  let seenBoolean = false;
  let seenNumber = false;
  let seenValidEntry = false;

  const propId = toPropertyId(valueProperty);

  for (const entry of entries) {
    const date = extractDate(entry, dateProperty);
    if (!date) continue;

    const obsidianValue = entry.getValue(propId);
    if (obsidianValue === null || obsidianValue instanceof NullValue) continue;

    seenValidEntry = true;

    if (obsidianValue instanceof BooleanValue) {
      seenBoolean = true;
    } else if (obsidianValue instanceof NumberValue) {
      const numVal = Number(obsidianValue.toString());
      if (isNaN(numVal)) {
        return "unsupported";
      }
      if (numVal !== 0 && numVal !== 1) {
        seenNumber = true;
      } else {
        seenBoolean = true;
      }
    } else if (obsidianValue instanceof StringValue) {
      const strVal = obsidianValue.toString();
      const num = parseFloat(strVal);
      if (!isNaN(num)) {
        if (num !== 0 && num !== 1) {
          seenNumber = true;
        } else {
          seenBoolean = true;
        }
      } else {
        const lower = strVal.toLowerCase();
        if (["true", "false", "yes", "no"].includes(lower)) {
          seenBoolean = true;
        } else {
          return "unsupported";
        }
      }
    } else {
      seenBoolean = true;
    }
  }

  if (!seenValidEntry) {
    return "unsupported";
  }

  if (seenNumber) return "number";
  if (seenBoolean) return "boolean";
  return "unsupported";
}
