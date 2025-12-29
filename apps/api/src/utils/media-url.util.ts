/**
 * Normalize media URLs to use the correct API_URL
 * Replaces localhost/IP URLs with the configured API_URL (HTTPS)
 */
export function normalizeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Get the correct API URL from environment
  const apiUrl = process.env.API_URL;
  
  // If no API_URL is set, try to construct it
  if (!apiUrl) {
    const port = process.env.PORT || process.env.API_PORT || 3001;
    const host = process.env.HOST || 'localhost';
    const defaultApiUrl = `http://${host}:${port}`;
    
    // Replace localhost/IP URLs with the default
    return url.replace(/https?:\/\/(localhost|127\.0\.0\.1|[\d\.]+)(:\d+)?/, defaultApiUrl);
  }

  // Extract the path from the URL (everything after the domain/IP:port)
  const urlMatch = url.match(/https?:\/\/[^\/]+(\/.*)?$/);
  const path = urlMatch ? (urlMatch[1] || '') : '';
  
  // If no path, return the URL as-is (shouldn't happen for media URLs)
  if (!path) {
    return url;
  }

  // Normalize API_URL - remove trailing slash
  const normalizedApiUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  
  // Always normalize HTTP/IP URLs to HTTPS API_URL
  // Check if URL is HTTP or uses IP address (needs normalization)
  const isHttpOrIp = url.startsWith('http://') || /https?:\/\/\d+\.\d+\.\d+\.\d+/.test(url);
  
  if (isHttpOrIp) {
    // Always use HTTPS API_URL for HTTP/IP URLs
    return `${normalizedApiUrl}${path}`;
  }
  
  // Check if URL already uses the correct domain (ignore port/HTTP vs HTTPS)
  const urlHostMatch = url.match(/https?:\/\/([^\/:]+)/);
  const apiUrlHostMatch = normalizedApiUrl.match(/https?:\/\/([^\/:]+)/);
  
  if (urlHostMatch && apiUrlHostMatch && urlHostMatch[1] === apiUrlHostMatch[1]) {
    // Same domain, but might need to change HTTP to HTTPS
    if (normalizedApiUrl.startsWith('https://') && url.startsWith('http://')) {
      // Upgrade HTTP to HTTPS
      return url.replace(/^http:\/\//, 'https://');
    }
    // Already correct
    return url;
  }

  // Build the normalized URL with the correct API_URL and the original path
  const normalized = `${normalizedApiUrl}${path}`;
  
  return normalized;
}

