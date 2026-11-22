/**
 * Wilson score interval for a binomial proportion (no continuity correction).
 * Wilson, E. B. (1927). Probable inference, the law of succession, and statistical inference.
 * JASA 22(158):209–212. doi:10.1080/01621459.1927.10502953
 */
export function wilsonInterval(
  successes: number,
  total: number,
  z = 1.959963984540054
): [number, number] {
  if (!Number.isFinite(successes) || !Number.isFinite(total) || total <= 0) return [0, 1];
  if (successes < 0 || successes > total) throw new RangeError("successes must be within [0, total]");
  const p = successes / total;
  const z2 = z * z;
  const denom = 1 + z2 / total;
  const centre = (p + z2 / (2 * total)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / total + z2 / (4 * total * total))) / denom;
  return [Math.max(0, Math.min(1, centre - half)), Math.max(0, Math.min(1, centre + half))];
}

export function proportion(numerator: number, denominator: number): {
  numerator: number;
  denominator: number;
  proportion: number | null;
  ci95: [number, number] | null;
} {
  if (denominator <= 0) {
    return { numerator, denominator, proportion: null, ci95: null };
  }
  return {
    numerator,
    denominator,
    proportion: numerator / denominator,
    ci95: wilsonInterval(numerator, denominator),
  };
}

export function pct(numerator: number, denominator: number): number | null {
  return denominator > 0 ? (numerator / denominator) * 100 : null;
}
