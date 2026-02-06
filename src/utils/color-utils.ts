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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(n)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function isValidHexColor(color: string): boolean {
  return /^#?[0-9a-f]{6}$/i.test(color);
}

function normalizeHex(hex: string): string {
  return hex.startsWith("#") ? hex : `#${hex}`;
}

function linearToSrgb(c: number): number {
  if (c <= 0.0031308) {
    return c * 12.92;
  }
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

function srgbToLinear(c: number): number {
  if (c <= 0.04045) {
    return c / 12.92;
  }
  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function rgbToOklab(
  r: number,
  g: number,
  b: number
): { L: number; a: number; b: number } {
  const lr = srgbToLinear(r / 255);
  const lg = srgbToLinear(g / 255);
  const lb = srgbToLinear(b / 255);

  const l = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
}

function oklabToRgb(
  L: number,
  a: number,
  b: number
): { r: number; g: number; b: number } {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  const lr = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

  return {
    r: Math.round(linearToSrgb(lr) * 255),
    g: Math.round(linearToSrgb(lg) * 255),
    b: Math.round(linearToSrgb(lb) * 255),
  };
}

export function interpolateColor(
  color1: string,
  color2: string,
  t: number
): string {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const lab1 = rgbToOklab(rgb1.r, rgb1.g, rgb1.b);
  const lab2 = rgbToOklab(rgb2.r, rgb2.g, rgb2.b);

  const L = lab1.L + (lab2.L - lab1.L) * t;
  const a = lab1.a + (lab2.a - lab1.a) * t;
  const b = lab1.b + (lab2.b - lab1.b) * t;

  const rgb = oklabToRgb(L, a, b);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  const r = srgbToLinear(rgb.r / 255);
  const g = srgbToLinear(rgb.g / 255);
  const b = srgbToLinear(rgb.b / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function adjustColorForTheme(hex: string, isDark: boolean): string {
  const luminance = getRelativeLuminance(hex);

  if (isDark) {
    if (luminance > 0.15) {
      return interpolateColor(hex, "#161b22", 0.7);
    }
  } else {
    if (luminance < 0.85) {
      return interpolateColor(hex, "#ebedf0", 0.7);
    }
  }
  return hex;
}

export function buildCustomColorScheme(
  zeroColor: string,
  maxColor: string
): ColorSchemeDefinition {
  const normalizedZero = normalizeHex(zeroColor);
  const normalizedMax = normalizeHex(maxColor);

  return {
    dark: {
      zero: adjustColorForTheme(normalizedZero, true),
      max: normalizedMax,
    },
    light: {
      zero: adjustColorForTheme(normalizedZero, false),
      max: normalizedMax,
    },
  };
}

export function getSchemeDefinition(
  scheme: ColorSchemeItem
): ColorSchemeDefinition {
  return buildCustomColorScheme(scheme.zeroColor, scheme.maxColor);
}

export function calculateIntensityNumeric(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 1;
  if (value <= min) return 0;
  if (value >= max) return 1;
  return (value - min) / (max - min);
}

export function calculateIntensityBoolean(value: boolean): number {
  return value ? 1 : 0;
}

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

export function isDarkMode(): boolean {
  return document.body.classList.contains("theme-dark");
}

export function getColorSchemeCSSVars(
  schemeDefinition: ColorSchemeDefinition,
  isDark: boolean
): string {
  const colors = isDark ? schemeDefinition.dark : schemeDefinition.light;

  return `
		--heatmap-color-zero: ${colors.zero};
		--heatmap-color-max: ${colors.max};
	`;
}
