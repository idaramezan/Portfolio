export function formatCompactNumber(value: number): string {
  if (value < 1000) return new Intl.NumberFormat("en-US").format(value);

  const compactValue = value / 1000;
  return `${compactValue.toFixed(compactValue >= 100 ? 1 : 1).replace(/\.0$/, "")}K`;
}
