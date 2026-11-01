"use client";

import { useEffect, useState } from "react";
import { Clock, Lock, UserCheck, Instagram } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export interface InstagramWindowState {
  channel: "whatsapp" | "instagram";
  isOpen: boolean;
  expiresAt: string | null;
  minutesRemaining: number | null;
  source: "standard" | "ctd_ad" | "private_reply_pending" | null;
  humanAgentAvailable: boolean;
  humanAgentExpiresAt: string | null;
  lastInboundAt: string | null;
  reason?: string;
}

const REFRESH_MS = 60 * 1000;

/**
 * Busca o estado da janela de mensagens do Instagram para o ticket.
 * Só faz requisição quando `enabled` (ticket de conexão INSTAGRAM). Atualiza a cada 60 s.
 */
export function useInstagramWindow(ticketId: string | undefined, enabled: boolean) {
  const [state, setState] = useState<InstagramWindowState | null>(null);

  useEffect(() => {
    setState(null);
    if (!ticketId || !enabled) return;
    let cancelled = false;

    async function load() {
      try {
        const { data } = await api.get<InstagramWindowState>(`/messages/ticket/${ticketId}/window`);
        if (!cancelled) setState(data);
      } catch (error) {
        console.debug("Could not fetch Instagram window:", error);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [ticketId, enabled]);

  return state;
}

/** Envio bloqueado: janela fechada e sem permissão de agente humano. */
export function isInstagramSendBlocked(state: InstagramWindowState | null): boolean {
  return !!state && state.channel === "instagram" && !state.isOpen && !state.humanAgentAvailable;
}

function formatRemaining(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "";
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h`;
  }
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

const CLOSED_DEFAULT_REASON = "Janela do Instagram fechada. O cliente precisa mandar mensagem.";

/** Badge do cabeçalho do chat com o estado da janela do Instagram. */
export function InstagramWindowBadge({ state }: { state: InstagramWindowState | null }) {
  if (!state || state.channel !== "instagram") return null;

  const base = "flex items-center gap-1 text-[10px] md:text-xs px-1.5 md:px-2 py-0.5 rounded";

  if (state.isOpen) {
    const remaining = formatRemaining(state.minutesRemaining);
    const label = `Janela do Instagram: aberta${remaining ? ` · expira em ${remaining}` : ""}`;
    const title =
      label +
      (state.source === "ctd_ad" ? " (anúncio Click-to-Direct: 7 dias)" : "") +
      (state.expiresAt ? ` — até ${formatDateTime(state.expiresAt)}` : "");
    return (
      <span
        className={cn(base, "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400")}
        title={title}
      >
        <Instagram className="w-3 h-3" />
        <span className="hidden md:inline">{label}</span>
        <span className="md:hidden">{remaining || "aberta"}</span>
      </span>
    );
  }

  if (state.humanAgentAvailable) {
    const until = state.humanAgentExpiresAt ? formatDateTime(state.humanAgentExpiresAt) : null;
    const label = until ? `Janela do Instagram: agente humano até ${until}` : "Janela do Instagram: agente humano";
    return (
      <span
        className={cn(base, "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}
        title={`${label}. A janela padrão de 24h fechou; mensagens serão enviadas com a tag HUMAN_AGENT.`}
      >
        <UserCheck className="w-3 h-3" />
        <span className="hidden md:inline">{label}</span>
        <span className="md:hidden">Humano</span>
      </span>
    );
  }

  const reason = state.reason || CLOSED_DEFAULT_REASON;
  return (
    <span
      className={cn(base, "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400")}
      title={reason}
    >
      <Lock className="w-3 h-3" />
      <span className="hidden md:inline">Janela do Instagram: fechada</span>
      <span className="md:hidden">Fechada</span>
    </span>
  );
}

/** Aviso exibido acima do campo de mensagem quando a janela está fechada. */
export function InstagramWindowComposerNotice({ state }: { state: InstagramWindowState | null }) {
  if (!state || state.channel !== "instagram" || state.isOpen) return null;

  if (state.humanAgentAvailable) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 border-t">
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span>
          Janela de 24h fechada: a mensagem será enviada como agente humano
          {state.humanAgentExpiresAt ? ` (permitido até ${formatDateTime(state.humanAgentExpiresAt)})` : ""}.
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border-t">
      <Lock className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{state.reason || CLOSED_DEFAULT_REASON}</span>
    </div>
  );
}
