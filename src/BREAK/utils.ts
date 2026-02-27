export function loadJsonModules<T extends Record<string, unknown>>(
  files: Record<string, unknown>
): T {
  return Object.values(files).reduce(
    (acc: T, mod: unknown) => ({ ...acc, ...(mod as { default: T }).default }),
    {} as T
  );
}
