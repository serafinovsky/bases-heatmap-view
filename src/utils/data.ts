import {
  BasesEntry,
  BasesPropertyId,
  BooleanValue,
  NullValue,
  NumberValue,
  StringValue,
} from "obsidian";
import { HeatmapEntry, ProcessedData, ValueType } from "../types";
import { formatDateISO, parseDateFromFilename, parseISODateString } from "./date";

/** Matches strings that are valid numbers (e.g. "42", "-3.14"). */
const NUMBER_REGEX = /^-?\d+(\.\d+)?$/;

/** Returns the standard "unsupported" result for unparseable values. */
function unsupported(displayValue: string) {
  return {
    value: null,
    displayValue,
    type: "unsupported" as const,
  };
}

/**
 * Parses a date string and returns it in ISO format (YYYY-MM-DD).
 *
 * @param dateStr - String to parse (ISO or parseable by Date)
 * @param filePath - File path for error context
 * @returns ISO date string or null if invalid
 */
function parseDateValue(dateStr: string, filePath: string): string | null {
  const parsed = parseISODateString(dateStr) ?? new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    console.warn(`Invalid date: "${dateStr}"`, { file: filePath });
    return null;
  }
  return formatDateISO(parsed);
}

/**
 * Extracts a date from a Bases entry.
 *
 * If dateProperty is null, parses the date from the file basename using dateFormat.
 * Otherwise reads the property value and parses it.
 *
 * @param entry - Bases entry
 * @param dateProperty - Property ID for date, or null to use filename
 * @param dateFormat - Format string for filename parsing
 * @returns ISO date string (YYYY-MM-DD) or null
 */
function extractDate(
  entry: BasesEntry,
  dateProperty: BasesPropertyId | null,
  dateFormat: string
): string | null {
  if (dateProperty === null) {
    try {
      const parsed = parseDateFromFilename(entry.file.basename, dateFormat);
      if (!parsed) {
        console.warn(`Failed to parse date from filename: "${entry.file.basename}"`, {
          file: entry.file.path,
        });
        return null;
      }
      return formatDateISO(parsed);
    } catch (error) {
      console.warn(`Error parsing date from filename: "${entry.file.basename}"`, {
        file: entry.file.path,
        error: String(error),
      });
      return null;
    }
  }

  const value = entry.getValue(dateProperty);

  if (value === null || value instanceof NullValue) {
    return null;
  }

  try {
    const dateStr = value.toString();
    return parseDateValue(dateStr, entry.file.path);
  } catch (error) {
    console.warn(`Error parsing date from property "${String(dateProperty)}"`, {
      file: entry.file.path,
      property: String(dateProperty),
      error: String(error),
    });
    return null;
  }
}

/**
 * Attempts to parse a string as a number.
 *
 * @param str - Input string
 * @returns Parsed value and display string, or null if not a valid number
 */
function parseStringAsNumber(str: string): { value: number; displayValue: string } | null {
  const trimmed = str.trim();
  if (!NUMBER_REGEX.test(trimmed)) {
    return null;
  }
  return {
    value: parseFloat(trimmed),
    displayValue: str,
  };
}

/**
 * Attempts to parse a string as a boolean (true/false, yes/no).
 *
 * @param str - Input string
 * @returns Mapped value (1/0) and display string, or null if not recognized
 */
function parseStringAsBoolean(str: string): { value: number; displayValue: string } | null {
  const lower = str.toLowerCase();
  if (lower === "true" || lower === "yes") {
    return { value: 1, displayValue: "Yes" };
  }
  if (lower === "false" || lower === "no") {
    return { value: 0, displayValue: "No" };
  }
  return null;
}

/**
 * Extracts a numeric/boolean value from a Bases entry property.
 *
 * Supports BooleanValue, NumberValue, StringValue (number or bool), and fallback for other types.
 *
 * @param entry - Bases entry
 * @param valueProperty - Property ID to read
 * @returns Value (0-1 for boolean, number for numeric), display string, and detected type
 */
function extractValue(
  entry: BasesEntry,
  valueProperty: BasesPropertyId
): { value: number | null; displayValue: string; type: ValueType } {
  const obsidianValue = entry.getValue(valueProperty);

  if (obsidianValue === null || obsidianValue instanceof NullValue) {
    return unsupported(`${String(valueProperty)}: not set`);
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
    const str = obsidianValue.toString();
    const numVal = Number(str);
    return isNaN(numVal) ? unsupported(str) : { value: numVal, displayValue: str, type: "number" };
  }

  if (obsidianValue instanceof StringValue) {
    const strVal = obsidianValue.toString();
    const numResult = parseStringAsNumber(strVal);
    if (numResult) return { ...numResult, type: "number" };
    const boolResult = parseStringAsBoolean(strVal);
    if (boolResult) return { ...boolResult, type: "boolean" };
    return unsupported(strVal);
  }

  return unsupported(obsidianValue.toString());
}

/**
 * Processes Bases entries into heatmap data.
 *
 * Extracts date and value from each entry, builds a map of dates to best entries,
 * and computes min/max and value type. Skips entries with invalid dates.
 * Returns "unsupported" if all values are unparseable or types are mixed (number + boolean).
 *
 * @param entries - Raw Bases entries from the query
 * @param dateProperty - Property ID for date, or null to parse from filename
 * @param dateFormat - Format string for filename date parsing
 * @param valueProperty - Property ID for heatmap value
 * @returns Processed entries map, min/max stats, count, and valueType
 */
export function processData(
  entries: BasesEntry[],
  dateProperty: BasesPropertyId | null,
  dateFormat: string,
  valueProperty: BasesPropertyId
): ProcessedData {
  const heatmapEntries = new Map<string, HeatmapEntry>();
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  let valueType: ValueType | null = null;

  for (const entry of entries) {
    const date = extractDate(entry, dateProperty, dateFormat);
    if (!date) continue;

    const { value, displayValue, type } = extractValue(entry, valueProperty);

    if (value !== null && (type === "number" || type === "boolean")) {
      if (valueType === null) {
        valueType = type;
      } else if (valueType !== type) {
        valueType = "unsupported";
      }
    }

    if (value !== null) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      count++;
    }

    const existing = heatmapEntries.get(date);
    const shouldSet =
      !existing || (value !== null && (existing.value === null || value > existing.value));
    if (shouldSet) {
      heatmapEntries.set(date, { date, value, note: entry.file, displayValue });
    }
  }

  if (count === 0) {
    min = 0;
    max = 1;
  } else if (min === max && min > 0) {
    min = 0;
  }

  return {
    entries: heatmapEntries,
    stats: {
      min,
      max,
      count,
      valueType: valueType ?? "unsupported",
    },
  };
}
