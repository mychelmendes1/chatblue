"use client";

import { useEffect, useState, useCallback } from "react";
import { Inbox, RefreshCw, Search, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { InboxCard, type InboxTicket } from "@/components/inbox/inbox-card";

export default function InboxPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const [tickets, setTickets] = useState<InboxTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [atendendoId, setAtendendoId] = useState<string | null>(null);

  const fetchTickets = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Buscar tickets sem atendente humano (null ou IA)
      const response = await api.get<{ tickets: InboxTicket[]; pagination: any }>("/tickets", {
        params: {
          noHumanAssigned: true, // Filtro para tickets sem atendente humano
          hideResolved: true,
          limit: 100,
        },
      });

      // A API retorna { tickets, pagination }
      const allTickets = response.data?.tickets || [];
      setTickets(allTickets);
    } catch (error: any) {
      console.error("Error fetching inbox tickets:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar tickets da caixa de entrada",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Filtrar por busca local
  const filteredTickets = tickets.filter((ticket) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      ticket.contact?.name?.toLowerCase().includes(searchLower) ||
      ticket.contact?.phone?.includes(search) ||
      ticket.protocol?.toLowerCase().includes(searchLower) ||
      ticket.department?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleAtender = async (ticketId: string) => {
    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Usuário não identificado",
        variant: "destructive",
      });
      return;
    }

    setAtendendoId(ticketId);

    try {
      await api.post(`/tickets/${ticketId}/assign`, {
        userId: user.id,
      });

      toast({
        title: "Sucesso",
        description: "Ticket atribuído a você. Vá para o Chat para atender.",
      });

      // Remover o ticket da lista
      setTickets((prev) => prev.filter((t) => t.id !== ticketId));
    } catch (error: any) {
      console.error("Error assigning ticket:", error);
      toast({
        title: "Erro",
        description: error.response?.data?.error || "Falha ao atender ticket",
        variant: "destructive",
      });
    } finally {
      setAtendendoId(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Inbox className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Caixa de Entrada</h1>
              <p className="text-sm text-muted-foreground">
                {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} aguardando atendimento
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, telefone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => fetchTickets(true)}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 md:p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <Inbox className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhum ticket na fila</h3>
              <p className="text-muted-foreground max-w-md">
                {search
                  ? "Nenhum ticket encontrado com os critérios de busca."
                  : "Todos os tickets estão sendo atendidos. Novos tickets aparecerão aqui automaticamente."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTickets.map((ticket) => (
                <InboxCard
                  key={ticket.id}
                  ticket={ticket}
                  onAtender={handleAtender}
                  isAtendendo={atendendoId === ticket.id}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      {filteredTickets.length > 0 && (
        <div className="p-4 border-t bg-muted/50">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Bot className="h-4 w-4 text-blue-500" />
              <span>= Atendido por IA</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
