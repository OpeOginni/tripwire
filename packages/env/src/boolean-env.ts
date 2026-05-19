/** Matches `"true"` / `"1"` strings; mirrors Boolean for other primitives. */
export const isTruthy = (
  value: string | boolean | number | undefined
): boolean =>
  typeof value === "string"
    ? value.toLowerCase() === "true" || value === "1"
    : Boolean(value)

/** Explicit false: `"false"`, `"0"`, or boolean false only. */
export const isFalsy = (
  value: string | boolean | number | undefined
): boolean =>
  typeof value === "string"
    ? value.toLowerCase() === "false" || value === "0"
    : value === false
