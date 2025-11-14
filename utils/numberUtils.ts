/**
 * Truncates a number to exactly 2 decimal places without rounding up
 * Example: 6.1999999 becomes 6.19
 * Handles floating-point precision errors by rounding to 10 decimal places first
 */
export const truncateToTwoDecimals = (value: number): string => {
  const roundedValue = Math.round(value * 1e10) / 1e10;
  const truncated = Math.floor(roundedValue * 100) / 100;
  return truncated.toFixed(2);
};
