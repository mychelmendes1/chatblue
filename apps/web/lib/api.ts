const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getToken(): string | null {
    if (typeof window === "undefined") return null;
    const stored = localStorage.getItem("chatblue-auth");
    if (!stored) return null;
    try {
      const { state } = JSON.parse(stored);
      return state?.accessToken;
    } catch {
      return null;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<{ data: T }> {
    const token = this.getToken();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      // Handle 429 (Too Many Requests) specifically
      if (response.status === 429) {
        const error = await response.json().catch(() => ({}));
        const errorMessage = error.message || error.error || "Too many requests. Please wait a moment and try again.";
        const rateLimitError = new Error(errorMessage);
        (rateLimitError as any).status = 429;
        throw rateLimitError;
      }

      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || "Request failed");
    }

    const result = await response.json();
    return { data: result };
  }

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }

  post<T>(path: string, data?: any) {
    return this.request<T>("POST", path, data);
  }

  put<T>(path: string, data?: any) {
    return this.request<T>("PUT", path, data);
  }

  patch<T>(path: string, data?: any) {
    return this.request<T>("PATCH", path, data);
  }

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }

  async uploadFile<T>(path: string, file: File): Promise<{ data: T }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("file", file);

    // Don't set Content-Type header - let browser set it with boundary for FormData
    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || "Upload failed");
    }

    const result = await response.json();
    return { data: result };
  }
}

export const api = new ApiClient(`${API_URL}/api`);
