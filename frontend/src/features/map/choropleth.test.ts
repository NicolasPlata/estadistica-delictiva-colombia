import { describe, expect, it } from "vitest";
import { buildChoroplethExpression, computeQuantileBreaks } from "./choropleth";

describe("computeQuantileBreaks", () => {
  it("returns null when there is no data (nothing to classify)", () => {
    expect(computeQuantileBreaks([])).toBeNull();
  });

  it("splits an ascending series into 5 quantile buckets (nearest-rank)", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    expect(computeQuantileBreaks(values)).toEqual([2, 4, 6, 8]);
  });

  it("does not require the input to be pre-sorted", () => {
    const values = [10, 3, 7, 1, 9, 2, 8, 4, 6, 5];

    expect(computeQuantileBreaks(values)).toEqual([2, 4, 6, 8]);
  });

  it("degenerates to the same value for every break when all inputs are equal", () => {
    expect(computeQuantileBreaks([5, 5, 5, 5])).toEqual([5, 5, 5, 5]);
  });

  it("handles a single data point", () => {
    expect(computeQuantileBreaks([42])).toEqual([42, 42, 42, 42]);
  });
});

describe("buildChoroplethExpression", () => {
  const breaks = [2, 4, 6, 8] as const;
  const colors = ["#c1", "#c2", "#c3", "#c4", "#c5"] as const;

  it("paints the neutral color when the region has no feature-state (HU-1.02: sin datos)", () => {
    const expr = buildChoroplethExpression(breaks, colors, "#neutral");

    expect(expr).toEqual([
      "case",
      ["==", ["feature-state", "cantidad"], null],
      "#neutral",
      [
        "step",
        ["feature-state", "cantidad"],
        "#c1",
        2,
        "#c2",
        4,
        "#c3",
        6,
        "#c4",
        8,
        "#c5",
      ],
    ]);
  });
});
