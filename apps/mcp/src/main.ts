import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { ChatblueClient } from './chatblue-client.js';
import { registerChatblueTools } from './register-tools.js';

const MCP_PATH = '/mcp';

function requireGate(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) {
  const expected = process.env.MCP_SERVER_API_KEY?.trim();
  if (!expected) {
    return next();
  }
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${expected}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

function buildServer(client: ChatblueClient): McpServer {
  const server = new McpServer(
    {
      name: 'chatblue',
      version: '0.1.0',
    },
    {
      instructions:
        'Ferramentas Chatblue: use chatblue_mcp_list_allowed_companies para ver tenants permitidos. Todas as demais tools exigem company_id (CUID). Super admin usa JWT interno + query companyId automaticamente.',
    }
  );
  registerChatblueTools(server, client);
  return server;
}

async function main() {
  const host = process.env.MCP_HTTP_HOST?.trim() || '127.0.0.1';
  const port = Number(process.env.MCP_HTTP_PORT || '3030');
  const allowedHostsEnv = process.env.MCP_ALLOWED_HOSTS?.trim();
  const allowedHosts = allowedHostsEnv ? allowedHostsEnv.split(',').map((h) => h.trim()).filter(Boolean) : undefined;

  const client = new ChatblueClient();
  await client.loadAllowlist().catch((e) => {
    console.warn('Aviso: não foi possível carregar allowlist MCP na subida (CHATBLUE_* ok?)', e);
  });

  const app = createMcpExpressApp(
    host === '0.0.0.0' || host === '::'
      ? { host, allowedHosts: allowedHosts?.length ? allowedHosts : undefined }
      : { host }
  );

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'chatblue-mcp' });
  });

  app.use(requireGate);

  const handleMcp = async (req: import('express').Request, res: import('express').Response) => {
    const mcpServer = buildServer(client);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, req.body);
      res.on('close', () => {
        void transport.close();
        void mcpServer.close();
      });
    } catch (error) {
      console.error('MCP request error', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  };

  app.post(MCP_PATH, handleMcp);
  app.get(MCP_PATH, (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  });
  app.delete(MCP_PATH, (_req, res) => {
    res.status(405).json({
      jsonrpc: '2.0',
      error: { code: -32000, message: 'Method not allowed.' },
      id: null,
    });
  });

  app.listen(port, host, () => {
    console.log(`Chatblue MCP (Streamable HTTP) em http://${host}:${port}${MCP_PATH}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
