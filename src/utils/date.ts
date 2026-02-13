import { moment } from "obsidian";
import { t } from "../i18n";
import { DateRange, MonthLabel } from "../types";

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Default date range: first and last day of current year. */
export function getDefaultDateStrings(): { startDate: string; endDate: string } {
  const year = new Date().getFullYear();
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}

/**
 * Returns an array of 12 short month names using localized translations.
 */
function getMonthNames(): string[] {
  return Array.from({ length: 12 }, (_, i) => t(`dates.monthShort.${i}`));
}

/**
 * Normalizes a date by setting hours, minutes, seconds, and milliseconds to 0.
 */
function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

/**
 * Parses a date string in ISO format (YYYY-MM-DD) and returns a Date object or null if invalid.
 */
export function parseISODateString(dateStr: string): Date | null {
  const match = ISO_DATE_REGEX.exec(dateStr.trim());
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    return null;
  }

  return normalizeDate(new Date(year, month, day));
}

/**
 * Parses date from a filename (e.g. daily note basename) using the given Moment.js format.
 */
export function parseDateFromFilename(filename: string, format: string): Date | null {
  const name = filename.replace(/\.md$/i, "");
  const fmt = format?.trim();
  if (!fmt) return null;

  const m = (moment as any)(name.trim(), fmt, true);
  if (!m.isValid()) return null;
  return normalizeDate(m.toDate());
}

/**
 * Parses a date from various property types (Date, string, number) and returns a normalized Date or null.
 */
export function parseDateFromProperty(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;

  const primitive = typeof value === "string" ? value : typeof value === "number" ? value : null;

  if (primitive === null) return null;

  const parsed =
    typeof primitive === "string"
      ? (parseISODateString(primitive) ?? new Date(primitive))
      : new Date(primitive);

  return isNaN(parsed.getTime()) ? null : normalizeDate(parsed);
}

/**
 * Formats a Date as an ISO date string (YYYY-MM-DD).
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formats an ISO date string for human-readable display (e.g. "Mon, Jan 15, 2024").
 */
export function formatDateDisplay(dateStr: string): string {
  const date = parseISODateString(dateStr) ?? new Date(dateStr);
  if (isNaN(date.getTime())) {
    return dateStr;
  }
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Generates an array of ISO date strings for each day from start to end (inclusive).
 */
export function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = normalizeDate(start);
  const endNormalized = normalizeDate(end);

  while (current <= endNormalized) {
    dates.push(formatDateISO(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

/**
 * Returns the day of week index (0–6) for a date, respecting weekStart (0 = Sunday, 1 = Monday).
 */
export function getDayOfWeek(date: Date, weekStart: 0 | 1): number {
  const day = date.getDay();
  if (weekStart === 0) {
    return day;
  }
  return day === 0 ? 6 : day - 1;
}

/**
 * Returns the 1-based week number for a date relative to rangeStart, respecting weekStart.
 */
export function getWeekNumber(date: Date, rangeStart: Date, weekStart: 0 | 1): number {
  const d = normalizeDate(date);
  const start = normalizeDate(rangeStart);

  const diffMs = d.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const startDayOfWeek = getDayOfWeek(start, weekStart);

  return Math.floor((diffDays + startDayOfWeek) / 7) + 1;
}

/**
 * Calculates the effective date range from entries and optional start/end strings.
 * Falls back to the earliest entry date or first day of year if start is invalid.
 */
export function calculateDateRange(
  entries: Map<string, unknown>,
  startDate: string | null,
  endDate: string | null
): DateRange {
  // Only accept dates in strict YYYY-MM-DD format; invalid input is treated as empty
  const parsedEnd = endDate ? parseISODateString(endDate) : null;
  const end = normalizeDate(parsedEnd ?? new Date());
  if (isNaN(end.getTime())) {
    end.setTime(new Date().getTime());
    end.setHours(0, 0, 0, 0);
  }

  let start: Date;
  const parsedStart = startDate ? parseISODateString(startDate) : null;
  if (parsedStart && !isNaN(parsedStart.getTime())) {
    start = normalizeDate(parsedStart);
  } else {
    const dates = Array.from(entries.keys())
      .map((d) => parseISODateString(d) ?? new Date(d))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    start = dates.length > 0 ? normalizeDate(dates[0]) : new Date(end.getFullYear(), 0, 1);
  }

  const startNorm = normalizeDate(start);
  return { start: startNorm, end };
}

/**
 * Base function for generating month labels for a date range.
 * Uses weekToMonths mapping and a callback to create/update label objects.
 */
function generateMonthLabelsBase(
  rangeStart: Date,
  rangeEnd: Date,
  weekStart: 0 | 1,
  createLabel: (name: string, start: number, end: number) => MonthLabel,
  updateEnd: (label: MonthLabel, end: number) => void
): MonthLabel[] {
  const weekToMonths = new Map<number, Set<number>>();

  const current = normalizeDate(rangeStart);
  const end = normalizeDate(rangeEnd);

  while (current <= end) {
    const month = current.getMonth();
    const week = getWeekNumber(current, rangeStart, weekStart);

    let monthSet = weekToMonths.get(week);
    if (!monthSet) {
      monthSet = new Set();
      weekToMonths.set(week, monthSet);
    }
    monthSet.add(month);

    current.setDate(current.getDate() + 1);
  }

  const labels: MonthLabel[] = [];
  const totalWeeks = getWeekNumber(end, rangeStart, weekStart);

  let currentMonth = -1;
  let currentLabel: MonthLabel | null = null;

  for (let week = 1; week <= totalWeeks; week++) {
    const monthsInWeek = weekToMonths.get(week);
    if (!monthsInWeek) continue;

    const monthsArray = Array.from(monthsInWeek).sort((a, b) => a - b);
    const primaryMonth = monthsArray[monthsArray.length - 1];

    if (primaryMonth !== currentMonth) {
      if (currentLabel) {
        updateEnd(currentLabel, week);
      }

      currentLabel = createLabel(getMonthNames()[primaryMonth], week, totalWeeks + 1);
      labels.push(currentLabel);
      currentMonth = primaryMonth;
    }
  }

  if (currentLabel) {
    updateEnd(currentLabel, totalWeeks + 1);
  }

  return labels;
}

/**
 * Generates month labels with startColumn and endColumn for the given date range.
 */
export function generateMonthLabels(
  rangeStart: Date,
  rangeEnd: Date,
  weekStart: 0 | 1
): MonthLabel[] {
  return generateMonthLabelsBase(
    rangeStart,
    rangeEnd,
    weekStart,
    (name, start, end) => ({ name, startColumn: start, endColumn: end }),
    (label, end) => {
      label.endColumn = end;
    }
  );
}

/**
 * Returns an array of 7 short weekday labels, optionally starting from Monday.
 */
export function getWeekdayLabels(weekStart: 0 | 1): string[] {
  const key = weekStart === 1 ? "dates.weekdayShortMondayFirst" : "dates.weekdayShort";
  return Array.from({ length: 7 }, (_, i) => t(`${key}.${i}`));
}
