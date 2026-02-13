import { describe, expect, it } from "vitest";
import {
  interpolateColor,
  calculateIntensityNumeric,
  getIntensityLevel,
  buildCustomColorScheme,
  getColorSchemeCSSVars,
  calculateIntensityBoolean,
} from "../src/utils/color";

describe("interpolateColor", () => {
  it.each([
    ["#000000", "#ffffff", 0, "#000000"],
    ["#ff0000", "#00ff00", 1, "#00ff00"],
    ["#ffffff", "#000000", 0, "#ffffff"],
  ])("t=%s returns expected color", (color1, color2, t, expected) => {
    expect(interpolateColor(color1, color2, t)).toBe(expected);
  });

  it("t=0.5 returns intermediate color", () => {
    const result = interpolateColor("#000000", "#ffffff", 0.5);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    expect(result).not.toBe("#000000");
    expect(result).not.toBe("#ffffff");
  });

  it("returns hex format", () => {
    const result = interpolateColor("#ebedf0", "#39d353", 0.7);
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

describe("calculateIntensityNumeric", () => {
  it.each([
    [0, 0, 100, 0],
    [100, 0, 100, 1],
    [50, 0, 100, 0.5],
    [25, 0, 100, 0.25],
    [10, 10, 100, 0],
    [100, 10, 100, 1],
    [50, 10, 90, 0.5],
    [5, 10, 100, 0],
    [150, 10, 100, 1],
  ])("value=%s, min=%s, max=%s → %s", (value, min, max, expected) => {
    expect(calculateIntensityNumeric(value, min, max)).toBe(expected);
  });

  it("returns 1 when min equals max", () => {
    expect(calculateIntensityNumeric(5, 10, 10)).toBe(1);
    expect(calculateIntensityNumeric(10, 10, 10)).toBe(1);
  });
});

describe("getIntensityLevel", () => {
  it.each([
    [0, 0],
    [-1, 0],
    [-0.5, 0],
    [0.001, 1],
    [0.25, 1],
    [0.26, 2],
    [0.5, 2],
    [0.75, 3],
    [1, 4],
    [1.5, 4],
    [2, 4],
  ])("intensity=%s → level %s", (intensity, expected) => {
    expect(getIntensityLevel(intensity)).toBe(expected);
  });
});

describe("buildCustomColorScheme", () => {
  it("returns structure with dark and light variants", () => {
    const result = buildCustomColorScheme("#ebedf0", "#39d353");
    expect(result).toHaveProperty("dark");
    expect(result).toHaveProperty("light");
    expect(result.dark).toHaveProperty("zero");
    expect(result.dark).toHaveProperty("max");
    expect(result.light).toHaveProperty("zero");
    expect(result.light).toHaveProperty("max");
  });

  it("preserves maxColor in both variants", () => {
    const maxColor = "#39d353";
    const result = buildCustomColorScheme("#ebedf0", maxColor);
    expect(result.dark.max).toBe(maxColor);
    expect(result.light.max).toBe(maxColor);
  });

  it("darkens bright zeroColor in dark theme", () => {
    const result = buildCustomColorScheme("#ffffff", "#000000");
    expect(result.dark.zero).not.toBe("#ffffff");
    expect(result.dark.zero).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("lightens dark zeroColor in light theme", () => {
    const result = buildCustomColorScheme("#000000", "#ffffff");
    expect(result.light.zero).not.toBe("#000000");
    expect(result.light.zero).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns valid hex for all colors", () => {
    const result = buildCustomColorScheme("#ebedf0", "#39d353");
    const hexRegex = /^#[0-9a-f]{6}$/i;
    expect(result.dark.zero).toMatch(hexRegex);
    expect(result.dark.max).toMatch(hexRegex);
    expect(result.light.zero).toMatch(hexRegex);
    expect(result.light.max).toMatch(hexRegex);
  });
});

describe("calculateIntensityBoolean", () => {
  it.each([
    [true, 1],
    [false, 0],
  ])("%s → %s", (value, expected) => {
    expect(calculateIntensityBoolean(value)).toBe(expected);
  });
});

describe("getColorSchemeCSSVars", () => {
  it("returns 5 CSS variables for levels 0-4", () => {
    const scheme = buildCustomColorScheme("#ebedf0", "#39d353");
    const result = getColorSchemeCSSVars(scheme, false);
    expect(Object.keys(result)).toHaveLength(5);
    expect(result["--heatmap-color-level-0"]).toBeDefined();
    expect(result["--heatmap-color-level-4"]).toBeDefined();
  });

  it("level 0 is zero color, level 4 is max color", () => {
    const scheme = buildCustomColorScheme("#ebedf0", "#39d353");
    const result = getColorSchemeCSSVars(scheme, false);
    expect(result["--heatmap-color-level-0"]).toBe(scheme.light.zero);
    expect(result["--heatmap-color-level-4"]).toBe(scheme.light.max);
  });
});
