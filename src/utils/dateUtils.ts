import { DateRange, MonthLabel, VerticalMonthLabel } from "../types";

const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

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

  const date = new Date(year, month, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

const DAILY_NOTE_PATTERNS = [
  /^(\d{4}-\d{2}-\d{2})/,
  /^(\d{4})\/(\d{2})\/(\d{2})/,
  /^(\w+ \d{1,2}, \d{4})/,
];

export function parseDateFromFilename(filename: string): Date | null {
  const name = filename.replace(/\.md$/i, "");

  for (const pattern of DAILY_NOTE_PATTERNS) {
    const match = name.match(pattern);
    if (match) {
      let dateStr: string;
      if (match.length === 4) {
        dateStr = `${match[1]}-${match[2]}-${match[3]}`;
      } else {
        dateStr = match[1];
      }

      const isoParsed = parseISODateString(dateStr);
      if (isoParsed) {
        return isoParsed;
      }

      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        parsed.setHours(0, 0, 0, 0);
        return parsed;
      }
    }
  }
  return null;
}

export function parseDateFromProperty(value: unknown): Date | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string") {
    const isoParsed = parseISODateString(value);
    if (isoParsed) {
      return isoParsed;
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }
  }

  if (typeof value === "number") {
    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

export function generateDateRange(start: Date, end: Date): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const endNormalized = new Date(end);
  endNormalized.setHours(0, 0, 0, 0);

  while (current <= endNormalized) {
    dates.push(formatDateISO(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export function getDayOfWeek(date: Date, weekStart: 0 | 1): number {
  const day = date.getDay();
  if (weekStart === 0) {
    return day;
  }
  return day === 0 ? 6 : day - 1;
}

export function getWeekNumber(
  date: Date,
  rangeStart: Date,
  weekStart: 0 | 1
): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);

  const start = new Date(rangeStart);
  start.setHours(0, 0, 0, 0);

  const diffMs = d.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const startDayOfWeek = getDayOfWeek(start, weekStart);

  return Math.floor((diffDays + startDayOfWeek) / 7) + 1;
}

export function calculateDateRange(
  entries: Map<string, unknown>,
  startDate: string | null,
  endDate: string | null
): DateRange {
  let start: Date;
  let end: Date;

  if (endDate) {
    end = parseISODateString(endDate) ?? new Date(endDate);
    if (isNaN(end.getTime())) {
      end = new Date();
    }
  } else {
    end = new Date();
  }
  end.setHours(0, 0, 0, 0);

  if (startDate) {
    start = parseISODateString(startDate) ?? new Date(startDate);
    if (isNaN(start.getTime())) {
      start = new Date(end.getFullYear(), 0, 1);
    }
  } else {
    const dates = Array.from(entries.keys())
      .map(d => parseISODateString(d) ?? new Date(d))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length > 0) {
      start = dates[0];
    } else {
      start = new Date(end.getFullYear(), 0, 1);
    }
  }
  start.setHours(0, 0, 0, 0);

  return { start, end };
}

export function generateMonthLabels(
  rangeStart: Date,
  rangeEnd: Date,
  weekStart: 0 | 1
): MonthLabel[] {
  const weekToMonths = new Map<number, Set<number>>();

  const current = new Date(rangeStart);
  current.setHours(0, 0, 0, 0);

  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);

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
        currentLabel.endColumn = week;
      }

      currentLabel = {
        name: MONTH_NAMES[primaryMonth],
        startColumn: week,
        endColumn: totalWeeks + 1,
      };
      labels.push(currentLabel);
      currentMonth = primaryMonth;
    }
  }

  if (currentLabel) {
    currentLabel.endColumn = totalWeeks + 1;
  }

  return labels;
}

export function generateVerticalMonthLabels(
  rangeStart: Date,
  rangeEnd: Date,
  weekStart: 0 | 1
): VerticalMonthLabel[] {
  const weekToMonths = new Map<number, Set<number>>();

  const current = new Date(rangeStart);
  current.setHours(0, 0, 0, 0);

  const end = new Date(rangeEnd);
  end.setHours(0, 0, 0, 0);

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

  const labels: VerticalMonthLabel[] = [];
  const totalWeeks = getWeekNumber(end, rangeStart, weekStart);

  let currentMonth = -1;
  let currentLabel: VerticalMonthLabel | null = null;

  for (let week = 1; week <= totalWeeks; week++) {
    const monthsInWeek = weekToMonths.get(week);
    if (!monthsInWeek) continue;

    const monthsArray = Array.from(monthsInWeek).sort((a, b) => a - b);
    const primaryMonth = monthsArray[monthsArray.length - 1];

    if (primaryMonth !== currentMonth) {
      if (currentLabel) {
        currentLabel.endRow = week;
      }

      currentLabel = {
        name: MONTH_NAMES[primaryMonth],
        startRow: week,
        endRow: totalWeeks + 1,
      };
      labels.push(currentLabel);
      currentMonth = primaryMonth;
    }
  }

  if (currentLabel) {
    currentLabel.endRow = totalWeeks + 1;
  }

  return labels;
}

export function getWeekdayLabels(weekStart: 0 | 1): string[] {
  const labels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  if (weekStart === 1) {
    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }
  return labels;
}
