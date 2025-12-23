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
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || "Request failed");
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

  delete<T>(path: string) {
    return this.request<T>("DELETE", path);
  }
}

export const api = new ApiClient(`${API_URL}/api`);
