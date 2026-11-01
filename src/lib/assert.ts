/** Returns `value`, or throws when a value the code relies on is missing. */
export function requireDefined<T>(
  value: T | undefined,
  description: string
): T {
  if (value === undefined) {
    throw new Error(`Expected ${description} to be defined`);
  }
  return value;
}
