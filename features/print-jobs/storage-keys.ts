const DISALLOWED_STORAGE_KEY_PREFIXES = ["data:", "http://", "https://"];

export function normalizePrintJobStorageKey(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const storageKey = value.trim();
  if (!storageKey || storageKey.length > 512) return null;

  const lowerStorageKey = storageKey.toLowerCase();
  if (DISALLOWED_STORAGE_KEY_PREFIXES.some((prefix) => lowerStorageKey.startsWith(prefix))) {
    return null;
  }

  if (storageKey.startsWith("{") || storageKey.startsWith("[") || storageKey.includes(";base64,")) {
    return null;
  }

  return storageKey;
}
