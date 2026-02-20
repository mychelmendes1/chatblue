/**
 * Normalize media URLs so they work in the current environment.
 * - Preserves localhost/127.0.0.1 URLs (development).
 * - In production with empty NEXT_PUBLIC_API_URL, uses relative path (same origin).
 */
export function normalizeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url || typeof url !== "string") return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;

  // Path-only URL (e.g. /uploads/audio/xxx.ogg) — turn into full URL with API base
  if (trimmed.startsWith("/")) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
    if (apiUrl) return `${apiUrl.replace(/\/$/, "")}${trimmed}`;
    return trimmed;
  }

  // Preserve localhost/127.0.0.1 so local dev keeps pointing at local API
  if (trimmed.startsWith("http://localhost") || trimmed.startsWith("http://127.0.0.1")) {
    return trimmed;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  if (apiUrl && trimmed.startsWith(apiUrl)) {
    return trimmed;
  }

  const urlMatch = trimmed.match(/https?:\/\/[^/]+(\/.*)?$/);
  const path = urlMatch ? (urlMatch[1] || "") : "";

  if (!path) return trimmed;

  if (!apiUrl || apiUrl === "") {
    return path;
  }

  return `${apiUrl.replace(/\/$/, "")}${path}`;
}

