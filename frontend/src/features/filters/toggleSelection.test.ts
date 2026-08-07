import { describe, expect, it } from "vitest";
import { toggleSelection } from "./toggleSelection";

describe("toggleSelection", () => {
  it("adds the item when it's not present", () => {
    expect(toggleSelection(["HURTO"], "HOMICIDIO")).toEqual([
      "HURTO",
      "HOMICIDIO",
    ]);
  });

  it("removes the item when it's already present", () => {
    expect(toggleSelection(["HURTO", "HOMICIDIO"], "HURTO")).toEqual([
      "HOMICIDIO",
    ]);
  });

  it("returns undefined instead of an empty array when the last item is removed", () => {
    // GlobalFilters.delitos es opcional — [] y undefined no deben
    // tratarse igual río abajo (un array vacío podría interpretarse como
    // "sin coincidencias" en vez de "sin filtrar").
    expect(toggleSelection(["HURTO"], "HURTO")).toBeUndefined();
  });
});
