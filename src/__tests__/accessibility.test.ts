import { describe, expect, it } from "vitest";
import {
  applyAccessibilityAttributes,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  parseAccessibilitySettings,
  type AccessibilitySettings,
} from "@/components/providers/AccessibilityProvider";
import { ACCESSIBILITY_STRINGS } from "@/lib/i18n/accessibility-strings";

function createMockRoot() {
  const attrs = new Map<string, string>();
  return {
    attrs,
    setAttribute(name: string, value: string) {
      attrs.set(name, value);
    },
    removeAttribute(name: string) {
      attrs.delete(name);
    },
  };
}

describe("iPhone-style Accessibility Settings", () => {
  it("falls back safely to defaults on null, corrupted, or invalid JSON values", () => {
    expect(parseAccessibilitySettings(null)).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS);
    expect(parseAccessibilitySettings("{bad-json")).toEqual(DEFAULT_ACCESSIBILITY_SETTINGS);
    expect(
      parseAccessibilitySettings(
        JSON.stringify({
          textScale: "huge",
          boldText: "yes",
          colorFilter: "sepia",
          speechRate: 3,
          highContrast: true,
        })
      )
    ).toEqual({
      ...DEFAULT_ACCESSIBILITY_SETTINGS,
      highContrast: true,
    });
  });

  it("parses valid persisted accessibility settings accurately", () => {
    const custom: AccessibilitySettings = {
      textScale: "xlarge",
      boldText: true,
      highContrast: true,
      buttonShapes: true,
      reduceMotion: true,
      largeTargets: true,
      colorFilter: "protanopia",
      speechRate: 0.85,
    };
    expect(parseAccessibilitySettings(JSON.stringify(custom))).toEqual(custom);
  });

  it("applies and clears data-a11y-* DOM attributes consistently", () => {
    const root = createMockRoot();

    applyAccessibilityAttributes(root, {
      textScale: "xlarge",
      boldText: true,
      highContrast: true,
      buttonShapes: true,
      reduceMotion: true,
      largeTargets: true,
      colorFilter: "deuteranopia",
      speechRate: 1.15,
    });

    expect(root.attrs.get("data-a11y-text")).toBe("xlarge");
    expect(root.attrs.get("data-a11y-bold")).toBe("true");
    expect(root.attrs.get("data-a11y-contrast")).toBe("true");
    expect(root.attrs.get("data-a11y-shapes")).toBe("true");
    expect(root.attrs.get("data-a11y-motion")).toBe("reduce");
    expect(root.attrs.get("data-a11y-targets")).toBe("true");
    expect(root.attrs.get("data-a11y-filter")).toBe("deuteranopia");

    applyAccessibilityAttributes(root, DEFAULT_ACCESSIBILITY_SETTINGS);
    expect(root.attrs.size).toBe(0);
  });

  it("provides complete localized accessibility strings for EN, FR, AR, and JA", () => {
    for (const lang of ["en", "fr", "ar", "ja"] as const) {
      expect(ACCESSIBILITY_STRINGS[lang].modalTitle.length).toBeGreaterThan(2);
      expect(ACCESSIBILITY_STRINGS[lang].resetAllBtn.length).toBeGreaterThan(2);
      expect(ACCESSIBILITY_STRINGS[lang].skipToContent.length).toBeGreaterThan(2);
    }
  });
});
