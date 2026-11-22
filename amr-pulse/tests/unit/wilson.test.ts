import { describe, expect, it } from "vitest";
import { pct, proportion, wilsonInterval } from "@/lib/statistics/wilson";

describe("Wilson score interval", () => {
  it("matches the published interval for 10/20", () => {
    const [low, high] = wilsonInterval(10, 20);
    expect(low).toBeCloseTo(0.2993, 4);
    expect(high).toBeCloseTo(0.7007, 4);
  });

  it("is asymmetric and bounded for 0/5", () => {
    const [low, high] = wilsonInterval(0, 5);
    expect(low).toBe(0);
    expect(high).toBeCloseTo(0.4345, 4);
  });

  it("returns [0,1] defensively for empty denominators", () => {
    expect(wilsonInterval(0, 0)).toEqual([0, 1]);
  });

  it("throws for impossible counts instead of silently clamping", () => {
    expect(() => wilsonInterval(6, 5)).toThrow(RangeError);
    expect(() => wilsonInterval(-1, 5)).toThrow(RangeError);
  });

  it("keeps numerator and denominator with nullable proportions", () => {
    expect(proportion(0, 0)).toEqual({ numerator: 0, denominator: 0, proportion: null, ci95: null });
    const estimate = proportion(5, 10);
    expect(estimate.proportion).toBe(0.5);
    expect(estimate.ci95).not.toBeNull();
    expect(estimate.ci95![0]).toBeLessThan(0.5);
    expect(estimate.ci95![1]).toBeGreaterThan(0.5);
    expect(pct(3, 4)).toBe(75);
    expect(pct(1, 0)).toBeNull();
  });
});
