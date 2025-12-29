/**
 * Normalize media URLs to use HTTPS
 * Replaces HTTP URLs (localhost/IP) with HTTPS domain
 */
export function normalizeMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  // Get the API URL from environment
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://chat.grupoblue.com.br';
  
  // If the URL is already using the correct API_URL, return it as-is
  if (url.startsWith(apiUrl)) {
    return url;
  }

  // Extract the path from the URL (everything after the domain/IP:port)
  const urlMatch = url.match(/https?:\/\/[^\/]+(\/.*)?$/);
  const path = urlMatch ? (urlMatch[1] || '') : '';
  
  // If no path, return the URL as-is (shouldn't happen for media URLs)
  if (!path) {
    return url;
  }

  // Build the normalized URL with the correct API_URL and the original path
  const normalized = `${apiUrl}${path}`;
  
  return normalized;
}

