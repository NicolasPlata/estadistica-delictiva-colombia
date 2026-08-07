import { describe, expect, it } from "vitest";
import { defaultBasemapForTheme } from "./theme";

describe("defaultBasemapForTheme", () => {
  it("returns 'osm' for the light theme (HU-1.05)", () => {
    expect(defaultBasemapForTheme("light")).toBe("osm");
  });

  it("returns 'oscuro' for the dark theme (HU-1.05)", () => {
    expect(defaultBasemapForTheme("dark")).toBe("oscuro");
  });
});
