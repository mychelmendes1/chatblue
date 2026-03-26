function resolveApiOrigin(): string {
  const raw = (process.env.NEXT_PUBLIC_API_URL || "").trim().replace(/\/$/, "");
  let origin = raw || "http://localhost:3001";
  if (process.env.NODE_ENV === "development") {
    try {
      const u = new URL(origin);
      const port = u.port || (u.protocol === "https:" ? "443" : "80");
      if (
        (u.hostname === "localhost" || u.hostname === "127.0.0.1") &&
        port === "3004"
      ) {
        origin = "http://localhost:3001";
      }
    } catch {
      /* ignore */
    }
  }
  return origin;
}

/**
 * Base URL para /api/*.
 * Em dev no Next (localhost:3004 ou :3000), usa o mesmo origin + /api para passar pelo
 * rewrite do next.config.js até o Express — evita HTML do Next quando a URL da API está errada.
 */
function resolveApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    const { hostname, port, protocol } = window.location;
    const effectivePort = port || (protocol === "https:" ? "443" : "80");
    if (
      process.env.NODE_ENV === "development" &&
      (hostname === "localhost" || hostname === "127.0.0.1") &&
      (effectivePort === "3004" || effectivePort === "3000")
    ) {
      return `${window.location.origin}/api`;
    }
  }
  return `${resolveApiOrigin()}/api`;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";
  if (
    contentType.includes("application/json") ||
    contentType.includes("text/json") ||
    contentType.includes("+json")
  ) {
    return response.json();
  }
  const text = await response.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      return JSON.parse(text);
    } catch {
      /* fall through */
    }
  }
  const hint =
    trimmed.startsWith("<!") || trimmed.startsWith("<")
      ? "O navegador recebeu HTML em vez de JSON. Em dev, use http://localhost:3004 e mantenha a API em http://localhost:3001. No arquivo apps/web/.env.local use exatamente: NEXT_PUBLIC_API_URL=http://localhost:3001 (nome completo da variável, com API e URL)."
      : trimmed.slice(0, 120);
  throw new Error(`Resposta inválida da API (esperado JSON). ${hint}`);
}

class ApiClient {
  private getBaseUrl(): string {
    return resolveApiBaseUrl();
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

    const response = await fetch(`${this.getBaseUrl()}${path}`, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    const contentType = response.headers.get("content-type") || "";
    const looksJson =
      contentType.includes("application/json") ||
      contentType.includes("text/json") ||
      contentType.includes("+json");

    if (!response.ok) {
      let error: Record<string, any> = {};
      if (looksJson) {
        error = (await response.json().catch(() => ({}))) as Record<string, any>;
      } else {
        const t = (await response.text().catch(() => "")).trim();
        if (t.startsWith("{") || t.startsWith("[")) {
          try {
            error = JSON.parse(t) as Record<string, any>;
          } catch {
            error = {};
          }
        }
      }
      const message =
        error?.message ||
        error?.error ||
        (error?.details?.length
          ? `Validação: ${error.details.map((d: { field?: string; message?: string }) => d.message || d.field).join(", ")}`
          : null) ||
        (response.status === 403 ? "Sem permissão para esta ação" : null) ||
        (response.status === 401 ? "Sessão expirada. Faça login novamente." : null) ||
        (!looksJson && response.status >= 400
          ? "A API retornou HTML ou texto em vez de JSON. Verifique se o servidor da API está em http://localhost:3001 e apps/web/.env.local com NEXT_PUBLIC_API_URL=http://localhost:3001."
          : null) ||
        `Erro ${response.status}`;
      throw new Error(message);
    }

    const result = (await parseJsonResponse(response)) as T;
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

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.getBaseUrl()}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || error.error || "Upload failed");
    }

    const result = await parseJsonResponse(response);
    return { data: result as T };
  }

  /** POST /upload/avatar — campo multipart deve ser "avatar" (multer). */
  async uploadAvatar(file: File): Promise<{ data: { success: boolean; file: { filename: string; url: string } } }> {
    const token = this.getToken();
    const formData = new FormData();
    formData.append("avatar", file);

    const headers: HeadersInit = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.getBaseUrl()}/upload/avatar`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(
        (error as { message?: string; error?: string }).message ||
          (error as { error?: string }).error ||
          "Falha ao enviar foto de perfil"
      );
    }

    const result = await parseJsonResponse(response);
    return { data: result as { success: boolean; file: { filename: string; url: string } } };
  }
}

export const api = new ApiClient();
