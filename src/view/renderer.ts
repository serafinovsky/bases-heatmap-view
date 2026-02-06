import {
  CELL_SIZE_VALUES,
  type CellSizePreset,
  type DateRange,
  type HeatmapEntry,
  type LayoutDirection,
  type MonthLabel,
  type ProcessedData,
  type VerticalMonthLabel,
  type CellState,
} from "../types";
import {
  formatDateDisplay,
  generateDateRange,
  generateMonthLabels,
  generateVerticalMonthLabels,
  getDayOfWeek,
  getWeekNumber,
  getWeekdayLabels,
  parseISODateString,
} from "../utils";
import {
  calculateIntensityBoolean,
  calculateIntensityNumeric,
  getColorForIntensity,
  isDarkMode,
  type ColorSchemeDefinition,
} from "../utils";

export interface RenderOptions {
  schemeDefinition: ColorSchemeDefinition;
  weekStart: 0 | 1;
  showWeekdayLabels: boolean;
  showMonthLabels: boolean;
  layoutDirection: LayoutDirection;
  cellSize: CellSizePreset;
}

function getCellState(
  date: string,
  entries: Map<string, HeatmapEntry>,
  stats: ProcessedData["stats"]
): CellState {
  const entry = entries.get(date);

  if (!entry) {
    return { type: "empty" };
  }

  if (entry.value === null) {
    return { type: "zero", note: entry.note };
  }

  let intensity: number;
  if (stats.hasNumeric) {
    intensity = calculateIntensityNumeric(entry.value, stats.min, stats.max);
  } else {
    intensity = calculateIntensityBoolean(entry.value > 0);
  }

  return { type: "filled", note: entry.note, intensity };
}

function createCellElement(
  date: string,
  state: CellState,
  row: number,
  column: number,
  entry: HeatmapEntry | undefined,
  schemeDefinition: ColorSchemeDefinition
): HTMLElement {
  const cell = document.createElement("div");
  cell.className = "heatmap-cell";
  cell.dataset.date = date;
  cell.style.gridRow = String(row);
  cell.style.gridColumn = String(column);

  const dark = isDarkMode();

  if (state.type === "empty") {
    cell.classList.add("heatmap-cell--empty");
  } else if (state.type === "zero") {
    cell.classList.add("heatmap-cell--zero");
    cell.dataset.notePath = state.note.path;
  } else if (state.type === "filled") {
    cell.classList.add("heatmap-cell--filled");
    cell.dataset.notePath = state.note.path;
    cell.dataset.intensity = String(state.intensity);
    cell.style.backgroundColor = getColorForIntensity(
      state.intensity,
      schemeDefinition,
      dark
    );
  }

  if (entry) {
    cell.dataset.displayValue = entry.displayValue;
  }

  const formattedDate = formatDateDisplay(date);
  const displayValue = entry ? entry.displayValue : "No note";
  cell.setAttribute("aria-label", `${formattedDate}: ${displayValue}`);

  return cell;
}

function createMonthLabelsRow(
  monthLabels: MonthLabel[],
  totalWeeks: number
): HTMLElement {
  const row = document.createElement("div");
  row.className = "heatmap-month-labels heatmap-month-labels-horizontal";
  row.style.setProperty("--total-weeks", String(totalWeeks));

  for (const label of monthLabels) {
    const span = document.createElement("span");
    span.className = "heatmap-month-label";
    span.textContent = label.name;
    span.style.gridColumnStart = String(label.startColumn);
    span.style.gridColumnEnd = String(label.endColumn);
    row.appendChild(span);
  }

  return row;
}

function createWeekdayLabels(weekStart: 0 | 1): HTMLElement {
  const container = document.createElement("div");
  container.className = "heatmap-weekday-labels";

  const labels = getWeekdayLabels(weekStart);
  const indices = weekStart === 1 ? [0, 2, 4] : [1, 3, 5];

  for (let i = 0; i < 7; i++) {
    const span = document.createElement("span");
    span.className = "heatmap-weekday-label";
    if (indices.includes(i)) {
      span.textContent = labels[i];
    }
    container.appendChild(span);
  }

  return container;
}

function createVerticalMonthLabelsColumn(
  monthLabels: VerticalMonthLabel[],
  totalWeeks: number
): HTMLElement {
  const column = document.createElement("div");
  column.className = "heatmap-month-labels heatmap-month-labels-vertical";
  column.style.setProperty("--total-weeks", String(totalWeeks));

  for (const label of monthLabels) {
    const span = document.createElement("span");
    span.className = "heatmap-month-label";
    span.textContent = label.name;
    span.style.gridRowStart = String(label.startRow);
    span.style.gridRowEnd = String(label.endRow);
    column.appendChild(span);
  }

  return column;
}

function createWeekdayLabelsRow(weekStart: 0 | 1): HTMLElement {
  const container = document.createElement("div");
  container.className = "heatmap-weekday-labels-horizontal";

  const labels = getWeekdayLabels(weekStart);
  for (const label of labels) {
    const span = document.createElement("span");
    span.className = "heatmap-weekday-label";
    span.textContent = label;
    container.appendChild(span);
  }

  return container;
}

export function createEmptyState(message: string, description: string): HTMLElement {
  const container = document.createElement("div");
  container.className = "heatmap-empty-state";

  const icon = document.createElement("div");
  icon.className = "heatmap-empty-state-icon";
  icon.textContent = "\u26A0";
  container.appendChild(icon);

  const title = document.createElement("div");
  title.className = "heatmap-empty-state-title";
  title.textContent = message;
  container.appendChild(title);

  const desc = document.createElement("div");
  desc.className = "heatmap-empty-state-description";
  desc.textContent = description;
  container.appendChild(desc);

  return container;
}

export function renderHeatmap(
  data: ProcessedData,
  dateRange: DateRange,
  options: RenderOptions
): HTMLElement {
  const { entries, stats } = data;
  const {
    schemeDefinition,
    weekStart,
    showWeekdayLabels,
    showMonthLabels,
    layoutDirection,
    cellSize,
  } = options;

  const allDates = generateDateRange(dateRange.start, dateRange.end);
  const totalWeeks = getWeekNumber(dateRange.end, dateRange.start, weekStart);

  const container = document.createElement("div");
  container.className = "heatmap-container";
  container.classList.add(
    layoutDirection === "vertical" ? "heatmap--vertical" : "heatmap--horizontal"
  );
  container.style.setProperty("--cell-size", `${CELL_SIZE_VALUES[cellSize]}px`);

  if (isDarkMode()) {
    container.classList.add("heatmap--dark");
  } else {
    container.classList.add("heatmap--light");
  }

  const scrollWrapper = document.createElement("div");
  scrollWrapper.className = "heatmap-scroll-wrapper";
  if (layoutDirection === "vertical") {
    scrollWrapper.classList.add("heatmap-scroll-wrapper--vertical");
  }

  const innerWrapper = document.createElement("div");
  innerWrapper.className = "heatmap-inner-wrapper";
  if (showWeekdayLabels && layoutDirection === "horizontal") {
    innerWrapper.classList.add("heatmap-inner-wrapper--with-labels");
  }

  const grid = document.createElement("div");
  grid.className = "heatmap-grid";

  const cellsContainer = document.createElement("div");
  cellsContainer.className = "heatmap-cells";
  cellsContainer.classList.add(
    layoutDirection === "vertical"
      ? "heatmap-cells--vertical"
      : "heatmap-cells--horizontal"
  );
  cellsContainer.style.setProperty("--total-weeks", String(totalWeeks));
  cellsContainer.setAttribute("role", "grid");

  const cellFragment = document.createDocumentFragment();
  for (const dateStr of allDates) {
    const date = parseISODateString(dateStr) ?? new Date(dateStr);
    if (isNaN(date.getTime())) {
      continue;
    }
    const dayOfWeek = getDayOfWeek(date, weekStart);
    const weekNum = getWeekNumber(date, dateRange.start, weekStart);

    const state = getCellState(dateStr, entries, stats);
    const entry = entries.get(dateStr);
    const row = layoutDirection === "vertical" ? weekNum : dayOfWeek + 1;
    const column = layoutDirection === "vertical" ? dayOfWeek + 1 : weekNum;

    const cell = createCellElement(
      dateStr,
      state,
      row,
      column,
      entry,
      schemeDefinition
    );

    cellFragment.appendChild(cell);
  }
  cellsContainer.appendChild(cellFragment);

  if (layoutDirection === "vertical") {
    grid.classList.add("heatmap-grid--vertical");
    if (showWeekdayLabels) {
      const weekdayRow = createWeekdayLabelsRow(weekStart);
      if (showMonthLabels) {
        weekdayRow.classList.add("heatmap-weekday-labels-horizontal--with-months");
      }
      grid.appendChild(weekdayRow);
    }
    const gridBody = document.createElement("div");
    gridBody.className = "heatmap-grid-body";

    if (showMonthLabels) {
      const monthLabels = generateVerticalMonthLabels(
        dateRange.start,
        dateRange.end,
        weekStart
      );
      gridBody.appendChild(createVerticalMonthLabelsColumn(monthLabels, totalWeeks));
    }

    gridBody.appendChild(cellsContainer);
    grid.appendChild(gridBody);
    innerWrapper.appendChild(grid);
  } else {
    if (showMonthLabels) {
      const monthLabels = generateMonthLabels(
        dateRange.start,
        dateRange.end,
        weekStart
      );
      innerWrapper.appendChild(createMonthLabelsRow(monthLabels, totalWeeks));
    }
    if (showWeekdayLabels) {
      grid.appendChild(createWeekdayLabels(weekStart));
    }
    grid.appendChild(cellsContainer);
    innerWrapper.appendChild(grid);
  }

  scrollWrapper.appendChild(innerWrapper);
  container.appendChild(scrollWrapper);

  return container;
}
