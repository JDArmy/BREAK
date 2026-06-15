export function getNestedMessageValue(
  messages: Record<string, unknown>,
  path: string
): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || current === undefined) return undefined;

    const arrayMatch = key.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, arrayKey, index] = arrayMatch;
      const arrayValue = (current as Record<string, unknown>)[arrayKey];
      return Array.isArray(arrayValue) ? arrayValue[Number(index)] : undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, messages);
}

export function getMessageStringArray(
  messages: Record<string, unknown>,
  path: string
): string[] {
  const value = getNestedMessageValue(messages, path);
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => String(item).trim())
    .filter((item) => item.length > 0);
}
