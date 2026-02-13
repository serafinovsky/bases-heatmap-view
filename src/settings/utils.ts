import { t } from "../i18n";
import type { ColorSchemeItem } from "../types";

/**
 * Generates ID from scheme name
 */
function generateSchemeId(name: string): string {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return id || "scheme";
}

/**
 * Validates color scheme data
 * @returns error message or null if valid
 */
export function validateScheme(scheme: ColorSchemeItem): string | null {
  if (!scheme.name.trim()) {
    return t("validation.nameRequired");
  }
  return null;
}

/**
 * Prepares scheme for saving (generates ID for new schemes)
 */
export function prepareSchemeForSave(scheme: ColorSchemeItem, isNew: boolean): ColorSchemeItem {
  return {
    ...scheme,
    id: isNew ? generateSchemeId(scheme.name) : scheme.id,
  };
}
