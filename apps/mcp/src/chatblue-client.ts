export type TokenBundle = {
  accessToken: string;
  refreshToken: string;
  allowedCompanyIds: string[];
  tokenCompanyId: string;
  requiresCompanyQueryParam: boolean;
  targetCompanyId: string;
  /** unix seconds */
  accessExp: number;
};

function decodeJwtExp(accessToken: string): number {
  try {
    const mid = accessToken.split('.')[1];
    if (!mid) return 0;
    const payload = JSON.parse(Buffer.from(mid, 'base64url').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : 0;
  } catch {
    return 0;
  }
}

export class ChatblueClient {
  private readonly baseUrl: string;
  private readonly mcpKey: string;
  /** companyId (tenant) -> session */
  private readonly cache = new Map<string, TokenBundle>();
  private allowlist: string[] | null = null;

  constructor() {
    const base = process.env.CHATBLUE_BASE_URL?.replace(/\/$/, '') ?? '';
    const key = process.env.CHATBLUE_MCP_KEY?.trim() ?? '';
    if (!base || !key) {
      throw new Error('CHATBLUE_BASE_URL e CHATBLUE_MCP_KEY são obrigatórios');
    }
    this.baseUrl = base;
    this.mcpKey = key;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async loadAllowlist(): Promise<string[]> {
    const res = await fetch(`${this.baseUrl}/api/integrations/mcp/key-info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mcpKey: this.mcpKey }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`key-info falhou: ${res.status} ${t}`);
    }
    const data = (await res.json()) as { allowedCompanyIds: string[] };
    this.allowlist = data.allowedCompanyIds ?? [];
    return this.allowlist;
  }

  async getAllowlist(): Promise<string[]> {
    if (this.allowlist?.length) return this.allowlist;
    return this.loadAllowlist();
  }

  assertCompanyAllowed(companyId: string): void {
    if (!this.allowlist?.includes(companyId)) {
      throw new Error(
        `company_id não está na lista permitida da chave MCP. Use chatblue_mcp_list_allowed_companies. Permitidos: ${(this.allowlist ?? []).join(', ') || '(vazio)'}`
      );
    }
  }

  private async exchangeToken(companyId: string): Promise<TokenBundle> {
    const res = await fetch(`${this.baseUrl}/api/integrations/mcp/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mcpKey: this.mcpKey, companyId }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`token MCP falhou: ${res.status} ${t}`);
    }
    const data = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      allowedCompanyIds: string[];
      tokenCompanyId: string;
      requiresCompanyQueryParam: boolean;
      targetCompanyId: string;
    };
    const accessExp = decodeJwtExp(data.accessToken);
    const bundle: TokenBundle = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      allowedCompanyIds: data.allowedCompanyIds,
      tokenCompanyId: data.tokenCompanyId,
      requiresCompanyQueryParam: data.requiresCompanyQueryParam,
      targetCompanyId: data.targetCompanyId,
      accessExp,
    };
    this.allowlist = data.allowedCompanyIds;
    this.cache.set(companyId, bundle);
    return bundle;
  }

  private async refreshAccess(companyId: string, refreshToken: string): Promise<TokenBundle> {
    const res = await fetch(`${this.baseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) {
      this.cache.delete(companyId);
      return this.exchangeToken(companyId);
    }
    const data = (await res.json()) as { accessToken: string };
    const prev = this.cache.get(companyId);
    if (!prev) {
      return this.exchangeToken(companyId);
    }
    const accessExp = decodeJwtExp(data.accessToken);
    const next: TokenBundle = {
      ...prev,
      accessToken: data.accessToken,
      accessExp,
    };
    this.cache.set(companyId, next);
    return next;
  }

  /** Garante access token válido para a empresa (tenant) informada. */
  async getSession(companyId: string): Promise<TokenBundle> {
    await this.getAllowlist();
    this.assertCompanyAllowed(companyId);

    const now = Math.floor(Date.now() / 1000);
    const cached = this.cache.get(companyId);
    if (cached?.accessExp && cached.accessExp > now + 60) {
      return cached;
    }
    if (cached?.refreshToken) {
      try {
        return await this.refreshAccess(companyId, cached.refreshToken);
      } catch {
        this.cache.delete(companyId);
      }
    }
    return this.exchangeToken(companyId);
  }

  private buildQuery(
    businessCompanyId: string,
    session: TokenBundle,
    existingSearch: URLSearchParams
  ): URLSearchParams {
    const q = new URLSearchParams(existingSearch);
    if (session.requiresCompanyQueryParam) {
      q.set('companyId', businessCompanyId);
    }
    return q;
  }

  private buildUrl(companyId: string, session: TokenBundle, path: string, init?: { query?: Record<string, string | number | boolean | undefined> }) {
    const rel = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(rel, `${this.baseUrl}/`);
    const q = this.buildQuery(companyId, session, url.searchParams);
    if (init?.query) {
      for (const [k, v] of Object.entries(init.query)) {
        if (v !== undefined && v !== '') q.set(k, String(v));
      }
    }
    url.search = q.toString();
    return url;
  }

  async requestJson(
    companyId: string,
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    init?: { query?: Record<string, string | number | boolean | undefined>; body?: unknown }
  ): Promise<unknown> {
    const session = await this.getSession(companyId);
    const url = this.buildUrl(companyId, session, path, init);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
    };
    if (init?.body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    let res = await fetch(url.toString(), {
      method,
      headers,
      body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    if (res.status === 401) {
      this.cache.delete(companyId);
      const s2 = await this.getSession(companyId);
      const url2 = this.buildUrl(companyId, s2, path, init);
      res = await fetch(url2.toString(), {
        method,
        headers: {
          ...headers,
          Authorization: `Bearer ${s2.accessToken}`,
        },
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
      });
    }

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Chatblue API ${method} ${path}: ${res.status} ${text.slice(0, 2000)}`);
    }
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
}
