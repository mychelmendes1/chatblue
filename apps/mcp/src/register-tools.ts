import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ChatblueClient } from './chatblue-client.js';

function jsonResult(data: unknown) {
  const text = JSON.stringify(data, null, 2);
  return {
    content: [{ type: 'text' as const, text: text.length > 95000 ? `${text.slice(0, 95000)}\n…(truncado)` : text }],
  };
}

const companyIdField = z
  .string()
  .describe('CUID da empresa (tenant). Deve estar em chatblue_mcp_list_allowed_companies.');

export function registerChatblueTools(server: McpServer, client: ChatblueClient): void {
  server.registerTool(
    'chatblue_mcp_list_allowed_companies',
    {
      description: 'Retorna os company_id que esta instância MCP pode usar (allowlist da chave CHATBLUE_MCP_KEY).',
    },
    async () => {
      const allowedCompanyIds = await client.getAllowlist();
      return jsonResult({ allowedCompanyIds });
    }
  );

  server.registerTool(
    'chatblue_list_tickets',
    {
      description: 'Lista tickets da empresa com filtros opcionais (GET /api/tickets).',
      inputSchema: {
        company_id: companyIdField,
        status: z.string().optional(),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(50).optional(),
        search: z.string().optional(),
      },
    },
    async (args) => {
      const { company_id, status, page, limit, search } = args as {
        company_id: string;
        status?: string;
        page?: number;
        limit?: number;
        search?: string;
      };
      const data = await client.requestJson(company_id, 'GET', '/api/tickets', {
        query: {
          page: page ?? 1,
          limit: Math.min(limit ?? 30, 50),
          ...(status ? { status } : {}),
          ...(search ? { search } : {}),
        },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_get_ticket',
    {
      description: 'Detalhe de um ticket (GET /api/tickets/:id).',
      inputSchema: {
        company_id: companyIdField,
        ticket_id: z.string().describe('ID do ticket'),
      },
    },
    async (args) => {
      const { company_id, ticket_id } = args as { company_id: string; ticket_id: string };
      const data = await client.requestJson(company_id, 'GET', `/api/tickets/${ticket_id}`);
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_list_messages',
    {
      description: 'Mensagens de um ticket (GET /api/messages/ticket/:ticketId).',
      inputSchema: {
        company_id: companyIdField,
        ticket_id: z.string().describe('ID do ticket'),
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
    },
    async (args) => {
      const { company_id, ticket_id, page, limit } = args as {
        company_id: string;
        ticket_id: string;
        page?: number;
        limit?: number;
      };
      const data = await client.requestJson(company_id, 'GET', `/api/messages/ticket/${ticket_id}`, {
        query: { page: page ?? 1, limit: Math.min(limit ?? 50, 100) },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_chat_search',
    {
      description: 'Busca textual em conversas (GET /api/chat/search).',
      inputSchema: {
        company_id: companyIdField,
        q: z.string().min(1).describe('Termo de busca'),
        limit: z.number().int().min(1).max(50).optional(),
      },
    },
    async (args) => {
      const { company_id, q, limit } = args as { company_id: string; q: string; limit?: number };
      const data = await client.requestJson(company_id, 'GET', '/api/chat/search', {
        query: { q, limit: Math.min(limit ?? 20, 50) },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_list_users',
    {
      description: 'Lista usuários da empresa (GET /api/users).',
      inputSchema: {
        company_id: companyIdField,
        department_id: z.string().optional(),
        is_ai: z.boolean().optional(),
        is_active: z.boolean().optional(),
      },
    },
    async (args) => {
      const { company_id, department_id, is_ai, is_active } = args as {
        company_id: string;
        department_id?: string;
        is_ai?: boolean;
        is_active?: boolean;
      };
      const data = await client.requestJson(company_id, 'GET', '/api/users', {
        query: {
          ...(department_id ? { departmentId: department_id } : {}),
          ...(is_ai !== undefined ? { isAI: String(is_ai) } : {}),
          ...(is_active !== undefined ? { isActive: String(is_active) } : {}),
        },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_list_contacts',
    {
      description: 'Lista contatos (GET /api/contacts).',
      inputSchema: {
        company_id: companyIdField,
        page: z.number().int().min(1).optional(),
        limit: z.number().int().min(1).max(100).optional(),
        search: z.string().optional(),
      },
    },
    async (args) => {
      const { company_id, page, limit, search } = args as {
        company_id: string;
        page?: number;
        limit?: number;
        search?: string;
      };
      const data = await client.requestJson(company_id, 'GET', '/api/contacts', {
        query: {
          page: page ?? 1,
          limit: Math.min(limit ?? 50, 100),
          ...(search ? { search } : {}),
        },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_list_departments',
    {
      description: 'Lista departamentos (GET /api/departments).',
      inputSchema: { company_id: companyIdField },
    },
    async (args) => {
      const { company_id } = args as { company_id: string };
      const data = await client.requestJson(company_id, 'GET', '/api/departments');
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_metrics_dashboard',
    {
      description: 'Métricas do dashboard (GET /api/metrics/dashboard).',
      inputSchema: {
        company_id: companyIdField,
        period: z.string().optional().describe("Janela em dias, ex.: '7', '30'"),
      },
    },
    async (args) => {
      const { company_id, period } = args as { company_id: string; period?: string };
      const data = await client.requestJson(company_id, 'GET', '/api/metrics/dashboard', {
        query: { period: period ?? '7' },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_list_connections',
    {
      description: 'Conexões WhatsApp/Instagram (GET /api/connections).',
      inputSchema: { company_id: companyIdField },
    },
    async (args) => {
      const { company_id } = args as { company_id: string };
      const data = await client.requestJson(company_id, 'GET', '/api/connections');
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_get_company_settings',
    {
      description: 'Configurações da empresa (GET /api/settings).',
      inputSchema: { company_id: companyIdField },
    },
    async (args) => {
      const { company_id } = args as { company_id: string };
      const data = await client.requestJson(company_id, 'GET', '/api/settings');
      return jsonResult(data);
    }
  );

  // --- escrita (onda B) ---

  server.registerTool(
    'chatblue_send_ticket_message',
    {
      description: 'Envia mensagem de atendente no ticket (POST /api/messages/ticket/:ticketId).',
      inputSchema: {
        company_id: companyIdField,
        ticket_id: z.string(),
        content: z.string().min(1),
        is_internal: z.boolean().optional().describe('Nota interna (não enviada ao cliente)'),
      },
    },
    async (args) => {
      const { company_id, ticket_id, content, is_internal } = args as {
        company_id: string;
        ticket_id: string;
        content: string;
        is_internal?: boolean;
      };
      const data = await client.requestJson(company_id, 'POST', `/api/messages/ticket/${ticket_id}`, {
        body: { content, isInternal: is_internal ?? false },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_assign_ticket',
    {
      description: 'Atribui ticket a um usuário (POST /api/tickets/:id/assign).',
      inputSchema: {
        company_id: companyIdField,
        ticket_id: z.string(),
        user_id: z.string().describe('ID do usuário atribuído'),
      },
    },
    async (args) => {
      const { company_id, ticket_id, user_id } = args as {
        company_id: string;
        ticket_id: string;
        user_id: string;
      };
      const data = await client.requestJson(company_id, 'POST', `/api/tickets/${ticket_id}/assign`, {
        body: { userId: user_id },
      });
      return jsonResult(data);
    }
  );

  server.registerTool(
    'chatblue_update_ticket_status',
    {
      description: 'Atualiza status do ticket (POST /api/tickets/:id/resolve, close, reopen conforme ação).',
      inputSchema: {
        company_id: companyIdField,
        ticket_id: z.string(),
        action: z.enum(['resolve', 'close', 'reopen']),
      },
    },
    async (args) => {
      const { company_id, ticket_id, action } = args as {
        company_id: string;
        ticket_id: string;
        action: 'resolve' | 'close' | 'reopen';
      };
      const path =
        action === 'resolve'
          ? `/api/tickets/${ticket_id}/resolve`
          : action === 'close'
            ? `/api/tickets/${ticket_id}/close`
            : `/api/tickets/${ticket_id}/reopen`;
      const data = await client.requestJson(company_id, 'POST', path, { body: {} });
      return jsonResult(data);
    }
  );
}
