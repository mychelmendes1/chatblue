"use client";

import { useEffect, useState, useCallback } from "react";
import { LayoutGrid, RefreshCw, Filter, Loader2, X } from "lucide-react";
import { type DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { KanbanBoard, type ColumnId } from "@/components/kanban/kanban-board";
import type { KanbanTicket } from "@/components/kanban/kanban-card";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isAI: boolean;
}

export default function KanbanPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const [tickets, setTickets] = useState<KanbanTicket[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [showOnlyMine, setShowOnlyMine] = useState(false);

  const fetchTickets = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Buscar todos os tickets (incluindo resolvidos para mostrar no kanban)
      const response = await api.get<{ tickets: KanbanTicket[]; pagination: any }>("/tickets", {
        params: {
          hideResolved: false,
          limit: 500,
        },
      });

      // A API retorna { tickets, pagination }
      const allTickets = response.data?.tickets || [];
      setTickets(allTickets);
    } catch (error: any) {
      console.error("Error fetching kanban tickets:", error);
      toast({
        title: "Erro",
        description: "Falha ao carregar tickets do Kanban",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [toast]);

  const fetchUsers = useCallback(async () => {
    try {
      const response = await api.get<User[]>("/users", {
        params: { isActive: true },
      });
      // Filtrar apenas usuários não-IA
      const humanUsers = (response.data || []).filter((u) => !u.isAI);
      setUsers(humanUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
    fetchUsers();
  }, [fetchTickets, fetchUsers]);

  // Filtrar tickets por usuários selecionados
  const filteredTickets = tickets.filter((ticket) => {
    // Se "mostrar apenas meus" está ativo
    if (showOnlyMine && currentUser?.id) {
      return ticket.assignedTo?.id === currentUser.id;
    }

    // Se há usuários selecionados no filtro
    if (selectedUserIds.length > 0) {
      return ticket.assignedTo && selectedUserIds.includes(ticket.assignedTo.id);
    }

    return true;
  });

  // Organizar tickets por coluna
  const ticketsByColumn: Record<ColumnId, KanbanTicket[]> = {
    novos: [],
    em_atendimento: [],
    aguardando: [],
    resolvidos: [],
  };

  filteredTickets.forEach((ticket) => {
    // Novos: sem atendente humano (null ou IA)
    const noHumanAssigned = !ticket.assignedTo || ticket.assignedTo.isAI === true;

    if (ticket.status === "RESOLVED" || ticket.status === "CLOSED") {
      ticketsByColumn.resolvidos.push(ticket);
    } else if (ticket.status === "WAITING") {
      ticketsByColumn.aguardando.push(ticket);
    } else if (ticket.status === "IN_PROGRESS" && !noHumanAssigned) {
      ticketsByColumn.em_atendimento.push(ticket);
    } else if (noHumanAssigned) {
      // PENDING ou com IA
      ticketsByColumn.novos.push(ticket);
    } else {
      // Fallback: em atendimento
      ticketsByColumn.em_atendimento.push(ticket);
    }
  });

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Cancelar se solto fora de uma coluna
    if (!destination) return;

    // Cancelar se solto na mesma posição
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const ticketId = draggableId;
    const fromColumn = source.droppableId as ColumnId;
    const toColumn = destination.droppableId as ColumnId;

    // Se mudou de coluna, atualizar status
    if (fromColumn !== toColumn) {
      try {
        // Determinar a ação baseada na coluna de destino
        if (toColumn === "novos") {
          // Não permitir mover para "Novos" manualmente
          toast({
            title: "Ação não permitida",
            description: "Tickets não podem ser movidos para a coluna Novos",
            variant: "destructive",
          });
          return;
        }

        if (toColumn === "em_atendimento") {
          if (fromColumn === "novos") {
            // Novos -> Em atendimento: Atribuir ao usuário atual
            await api.post(`/tickets/${ticketId}/assign`, {
              userId: currentUser?.id,
            });
          } else {
            // Aguardando/Resolvidos -> Em atendimento: Mudar status
            await api.put(`/tickets/${ticketId}/status`, {
              status: "IN_PROGRESS",
            });
          }
        } else if (toColumn === "aguardando") {
          await api.put(`/tickets/${ticketId}/status`, {
            status: "WAITING",
          });
        } else if (toColumn === "resolvidos") {
          await api.put(`/tickets/${ticketId}/status`, {
            status: "RESOLVED",
          });
        }

        // Recarregar tickets para refletir mudanças
        await fetchTickets(true);

        toast({
          title: "Ticket atualizado",
          description: "Status do ticket alterado com sucesso",
        });
      } catch (error: any) {
        console.error("Error updating ticket:", error);
        toast({
          title: "Erro",
          description: error.response?.data?.error || "Falha ao atualizar ticket",
          variant: "destructive",
        });
      }
    }
  };

  const toggleUserFilter = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const clearFilters = () => {
    setSelectedUserIds([]);
    setShowOnlyMine(false);
  };

  const activeFiltersCount =
    selectedUserIds.length + (showOnlyMine ? 1 : 0);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 md:p-6 border-b bg-background">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <LayoutGrid className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Kanban</h1>
              <p className="text-sm text-muted-foreground">
                {filteredTickets.length} ticket{filteredTickets.length !== 1 ? "s" : ""} no quadro
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtro de Atendentes */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filtrar
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filtrar por atendente</h4>
                    {activeFiltersCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="h-auto p-1 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Limpar
                      </Button>
                    )}
                  </div>

                  {/* Mostrar apenas meus */}
                  <div className="flex items-center space-x-2 pb-2 border-b">
                    <Checkbox
                      id="show-mine"
                      checked={showOnlyMine}
                      onCheckedChange={(checked) => {
                        setShowOnlyMine(checked === true);
                        if (checked) setSelectedUserIds([]);
                      }}
                    />
                    <Label htmlFor="show-mine" className="text-sm cursor-pointer">
                      Mostrar apenas meus tickets
                    </Label>
                  </div>

                  {/* Lista de usuários */}
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`user-${user.id}`}
                            checked={selectedUserIds.includes(user.id)}
                            onCheckedChange={() => {
                              toggleUserFilter(user.id);
                              setShowOnlyMine(false);
                            }}
                            disabled={showOnlyMine}
                          />
                          <Label
                            htmlFor={`user-${user.id}`}
                            className="flex items-center gap-2 text-sm cursor-pointer"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user.avatar} />
                              <AvatarFallback className="text-[10px]">
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{user.name}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

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
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <KanbanBoard
            ticketsByColumn={ticketsByColumn}
            onDragEnd={handleDragEnd}
          />
        )}
      </div>
    </div>
  );
}
