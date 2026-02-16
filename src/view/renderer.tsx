import { h, Fragment, render } from "preact";
import { t } from "../i18n";
import {
  CELL_SIZE_VALUES,
  type CellSizePreset,
  type DateRange,
  type HeatmapEntry,
  type ProcessedData,
  type CellState,
  type MonthLabel,
} from "../types";
import {
  formatDateDisplay,
  generateDateRange,
  generateMonthLabels,
  getDayOfWeek,
  getWeekNumber,
  getWeekdayLabels,
  parseISODateString,
  calculateIntensityBoolean,
  calculateIntensityNumeric,
  getIntensityLevel,
  getColorSchemeCSSVars,
  type ColorSchemeDefinition,
} from "../utils";

const WEEKDAY_LABEL_VISIBLE_INDICES: Record<0 | 1, number[]> = {
  0: [1, 3, 5],
  1: [0, 2, 4],
};

export interface RenderOptions {
  schemeDefinition: ColorSchemeDefinition;
  isDark: boolean;
  weekStart: 0 | 1;
  showWeekdayLabels: boolean;
  showMonthLabels: boolean;
  cellSize: CellSizePreset;
}

function getCellState(entry: HeatmapEntry | undefined, stats: ProcessedData["stats"]): CellState {
  if (!entry) return { type: "empty" };
  if (entry.value === null) return { type: "zero", note: entry.note };

  const intensity =
    stats.valueType === "number"
      ? calculateIntensityNumeric(entry.value, stats.min, stats.max)
      : calculateIntensityBoolean(entry.value > 0);

  return { type: "filled", note: entry.note, intensity };
}

function Cell({
  date,
  state,
  row,
  column,
  entry,
}: {
  date: string;
  state: CellState;
  row: number;
  column: number;
  entry: HeatmapEntry | undefined;
}) {
  const cellClass = `heatmap-cell heatmap-cell--${state.type}`;
  const style = {
    gridRow: String(row),
    gridColumn: String(column),
  };

  const displayValue = entry?.displayValue ?? t("view.noNote");
  const ariaLabel = `${formatDateDisplay(date)}: ${displayValue}`;

  const props: Record<string, string> = {
    "data-date": date,
  };

  if (entry) {
    props["data-display-value"] = entry.displayValue;
  }

  if (state.type !== "empty") {
    props["data-note-path"] = state.note.path;
  }

  if (state.type === "zero") {
    props["data-level"] = "0";
  } else if (state.type === "filled") {
    props["data-level"] = String(getIntensityLevel(state.intensity));
    props["data-intensity"] = String(state.intensity);
  }

  return <div class={cellClass} style={style} {...props} aria-label={ariaLabel} />;
}

function MonthLabels({ labels, totalWeeks }: { labels: MonthLabel[]; totalWeeks: number }) {
  return (
    <div
      class="heatmap-month-labels heatmap-month-labels-horizontal"
      style={{ "--total-weeks": String(totalWeeks) }}
    >
      {labels.map((label) => (
        <span
          key={`${label.name}-${label.startColumn}`}
          class="heatmap-month-label"
          style={{
            gridColumnStart: String(label.startColumn),
            gridColumnEnd: String(label.endColumn),
          }}
        >
          {label.name}
        </span>
      ))}
    </div>
  );
}

function WeekdayLabels({ weekStart }: { weekStart: 0 | 1 }) {
  const labels = getWeekdayLabels(weekStart);
  const visibleIndices = WEEKDAY_LABEL_VISIBLE_INDICES[weekStart];

  return (
    <div class="heatmap-weekday-labels">
      {labels.map((label, i) => (
        <span key={i} class="heatmap-weekday-label">
          {visibleIndices.includes(i) ? label : ""}
        </span>
      ))}
    </div>
  );
}

export function EmptyState({ message, description }: { message: string; description: string }) {
  return (
    <div class="heatmap-empty-state">
      <div class="heatmap-empty-state-icon">⚠</div>
      <div class="heatmap-empty-state-title">{message}</div>
      <div class="heatmap-empty-state-description">{description}</div>
    </div>
  );
}

function Cells({
  allDates,
  dateRange,
  entries,
  stats,
  weekStart,
}: {
  allDates: string[];
  dateRange: DateRange;
  entries: Map<string, HeatmapEntry>;
  stats: ProcessedData["stats"];
  weekStart: 0 | 1;
}) {
  const cells = [];

  for (const dateStr of allDates) {
    const date = parseISODateString(dateStr) ?? new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    const dayOfWeek = getDayOfWeek(date, weekStart);
    const weekNum = getWeekNumber(date, dateRange.start, weekStart);
    const entry = entries.get(dateStr);
    const state = getCellState(entry, stats);

    const row = dayOfWeek + 1;
    const column = weekNum;

    cells.push(
      <Cell key={dateStr} date={dateStr} state={state} row={row} column={column} entry={entry} />
    );
  }

  return <>{cells}</>;
}

function Heatmap({
  data,
  dateRange,
  options,
}: {
  data: ProcessedData;
  dateRange: DateRange;
  options: RenderOptions;
}) {
  const { entries, stats } = data;
  const { schemeDefinition, isDark, weekStart, showWeekdayLabels, showMonthLabels, cellSize } =
    options;

  const allDates = generateDateRange(dateRange.start, dateRange.end);
  const totalWeeks = getWeekNumber(dateRange.end, dateRange.start, weekStart);

  const containerClass = `heatmap-container heatmap--horizontal heatmap--${isDark ? "dark" : "light"}`;
  const innerWrapperClass = `heatmap-inner-wrapper ${showWeekdayLabels ? "heatmap-inner-wrapper--with-labels" : ""}`;

  return (
    <div class={containerClass} style={{ "--cell-size": `${CELL_SIZE_VALUES[cellSize]}px` }}>
      <div class="heatmap-scroll-wrapper">
        <div class={innerWrapperClass}>
          {showMonthLabels && (
            <MonthLabels
              labels={generateMonthLabels(dateRange.start, dateRange.end, weekStart)}
              totalWeeks={totalWeeks}
            />
          )}
          <div class="heatmap-grid">
            {showWeekdayLabels && <WeekdayLabels weekStart={weekStart} />}
            <div
              class="heatmap-cells heatmap-cells--horizontal"
              style={{
                "--total-weeks": String(totalWeeks),
                ...getColorSchemeCSSVars(schemeDefinition, isDark),
              }}
              role="grid"
            >
              <Cells
                allDates={allDates}
                dateRange={dateRange}
                entries={entries}
                stats={stats}
                weekStart={weekStart}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function renderHeatmap(
  data: ProcessedData,
  dateRange: DateRange,
  options: RenderOptions
): HTMLElement {
  const container = document.createElement("div");
  render(<Heatmap data={data} dateRange={dateRange} options={options} />, container);
  return container.firstElementChild as HTMLElement;
}

export function createEmptyState(message: string, description: string): HTMLElement {
  const container = document.createElement("div");
  render(<EmptyState message={message} description={description} />, container);
  return container.firstElementChild as HTMLElement;
}
