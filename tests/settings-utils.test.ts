import { describe, expect, it, vi } from "vitest";
import { prepareSchemeForSave, validateScheme } from "../src/settings/utils";

vi.mock("../src/i18n", () => ({
  t: (key: string) => key,
}));

const baseScheme = {
  id: "",
  name: "",
  zeroColor: "#ffffff",
  maxColor: "#000000",
};

describe("generateSchemeId (via prepareSchemeForSave)", () => {
  it.each([
    ["Hello World", "hello-world"],
    ["My Color Scheme", "my-color-scheme"],
    ["Purple", "purple"],
    ["green", "green"],
    ["my-scheme", "my-scheme"],
    ["scheme", "scheme"],
    ["Hello   World", "hello-world"],
    ["Hello---World", "hello-world"],
    ["-Green", "green"],
    ["Green-", "green"],
    ["-Green-", "green"],
    ["  Green  ", "green"],
    ["Hello! World", "hello-world"],
    ["Test & Demo", "test-demo"],
    ["Scheme #1", "scheme-1"],
    ["Hello, World!", "hello-world"],
    ["Scheme 2024", "scheme-2024"],
    ["123", "123"],
    ["1", "1"],
    ["a", "a"],
    ["A", "a"],
    ["Café", "caf"],
  ])('"%s" -> "%s"', (name, expected) => {
    const result = prepareSchemeForSave({ ...baseScheme, name }, true);
    expect(result.id).toBe(expected);
  });

  it.each([
    ["", "scheme"],
    ["   ", "scheme"],
    ["---", "scheme"],
    [" !!! ", "scheme"],
    ["-", "scheme"],
    ["Привет", "scheme"],
  ])('"%s" -> "%s" (fallback)', (name, expected) => {
    const result = prepareSchemeForSave({ ...baseScheme, name }, true);
    expect(result.id).toBe(expected);
  });
});

describe("validateScheme", () => {
  const validScheme = {
    id: "green",
    name: "Green",
    zeroColor: "#ffffff",
    maxColor: "#000000",
  };

  it("returns null when scheme is valid", () => {
    expect(validateScheme(validScheme)).toBeNull();
  });

  it.each([
    ["", "empty"],
    ["   ", "whitespace"],
    ["\t\n", "tabs and newlines"],
  ])("returns nameRequired when name is invalid: %s", (name) => {
    const scheme = { ...validScheme, name };
    expect(validateScheme(scheme)).toBe("validation.nameRequired");
  });
});

describe("prepareSchemeForSave", () => {
  it("preserves id when isNew is false", () => {
    const scheme = {
      id: "my-custom-id",
      name: "Test",
      zeroColor: "#fff",
      maxColor: "#000",
    };
    const result = prepareSchemeForSave(scheme, false);
    expect(result.id).toBe("my-custom-id");
  });

  it("generates id from name when isNew is true", () => {
    const scheme = {
      id: "ignored",
      name: "My Scheme",
      zeroColor: "#fff",
      maxColor: "#000",
    };
    const result = prepareSchemeForSave(scheme, true);
    expect(result.id).toBe("my-scheme");
  });

  it("preserves other fields (name, isDefault)", () => {
    const scheme = {
      id: "green",
      name: "Green",
      zeroColor: "ffffff",
      maxColor: "000000",
      isDefault: true,
    };
    const result = prepareSchemeForSave(scheme, false);
    expect(result.name).toBe("Green");
    expect(result.isDefault).toBe(true);
  });

  it("preserves colors and id when isNew is false", () => {
    const scheme = {
      id: "existing-id",
      name: "Test",
      zeroColor: "#ff0000",
      maxColor: "#00ff00",
    };
    const result = prepareSchemeForSave(scheme, false);
    expect(result.zeroColor).toBe("#ff0000");
    expect(result.maxColor).toBe("#00ff00");
    expect(result.id).toBe("existing-id");
  });
});
