export function calculateMoM(currentValue: number | null, previousValue: number | null): number | null {
  if (currentValue === null || previousValue === null) {
    return null;
  }
  return currentValue - previousValue;
}
