import { formatHex, interpolate, wcagLuminance, parse } from "culori";
import { ColorSchemeItem } from "../types";

export interface ColorSchemeDefinition {
  dark: {
    zero: string;
    max: string;
  };
  light: {
    zero: string;
    max: string;
  };
}

/**
 * Interpolates colors in Oklab color space (perceptually uniform)
 * @param color1 - first color (hex)
 * @param color2 - second color (hex)
 * @param t - interpolation coefficient (0..1)
 */
export function interpolateColor(color1: string, color2: string, t: number): string {
  const interpolator = interpolate([color1, color2], "oklab");
  return formatHex(interpolator(t));
}

/**
 * Calculates relative luminance of a color (WCAG standard)
 */
export function getRelativeLuminance(hex: string): number {
  const color = parse(hex);
  return color ? wcagLuminance(color) : 0;
}

/**
 * Adjusts color for dark or light theme
 * Makes colors darker in dark mode if too bright,
 * and lighter in light mode if too dark
 */
function adjustColorForTheme(hex: string, isDark: boolean): string {
  const luminance = getRelativeLuminance(hex);

  if (isDark) {
    // In dark theme, make bright colors darker
    if (luminance > 0.15) {
      return interpolateColor(hex, "#161b22", 0.7);
    }
  } else {
    // In light theme, make dark colors lighter
    if (luminance < 0.85) {
      return interpolateColor(hex, "#ebedf0", 0.7);
    }
  }
  return hex;
}

/**
 * Builds color scheme with adaptation for dark and light themes
 */
export function buildCustomColorScheme(zeroColor: string, maxColor: string): ColorSchemeDefinition {
  return {
    dark: {
      zero: adjustColorForTheme(zeroColor, true),
      max: maxColor,
    },
    light: {
      zero: adjustColorForTheme(zeroColor, false),
      max: maxColor,
    },
  };
}

/**
 * Gets color scheme definition from settings
 */
export function getSchemeDefinition(scheme: ColorSchemeItem): ColorSchemeDefinition {
  return buildCustomColorScheme(scheme.zeroColor, scheme.maxColor);
}

/**
 * Calculates intensity for numeric values (0..1)
 */
export function calculateIntensityNumeric(value: number, min: number, max: number): number {
  if (max === min) return 1;
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

/**
 * Calculates intensity for boolean values (0 or 1)
 */
export function calculateIntensityBoolean(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * Gets color for given intensity
 * Interpolates between zero and max color in Oklab space
 */
export function getColorForIntensity(
  intensity: number,
  schemeDefinition: ColorSchemeDefinition,
  isDark: boolean
): string {
  const colors = isDark ? schemeDefinition.dark : schemeDefinition.light;

  if (intensity <= 0) {
    return colors.zero;
  }

  const t = Math.max(0, Math.min(1, intensity));
  return interpolateColor(colors.zero, colors.max, t);
}

export const INTENSITY_LEVELS = [0, 0.2, 0.45, 0.7, 1] as const;

/**
 * Maps intensity (0..1) to discrete level (0..4).
 */
export function getIntensityLevel(intensity: number): number {
  if (intensity <= 0) return 0;
  return Math.min(4, Math.ceil(intensity * 4));
}

/**
 * Generates CSS variables for 5 intensity levels (0..4).
 * Returns object for inline style assignment.
 */
export function getColorSchemeCSSVars(
  schemeDefinition: ColorSchemeDefinition,
  isDark: boolean
): Record<string, string> {
  const colors = isDark ? schemeDefinition.dark : schemeDefinition.light;
  const result: Record<string, string> = {};

  for (const [i, t] of INTENSITY_LEVELS.entries()) {
    result[`--heatmap-color-level-${i}`] =
      t === 0 ? colors.zero : interpolateColor(colors.zero, colors.max, t);
  }

  return result;
}
