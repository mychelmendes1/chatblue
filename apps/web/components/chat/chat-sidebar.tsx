"use client";

import { useEffect, useState } from "react";
import { Search, Filter, Bot, User, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatDate, formatPhone, getStatusColor, formatSLATime } from "@/lib/utils";
import { useChatStore } from "@/stores/chat.store";
import { api } from "@/lib/api";

export function ChatSidebar() {
  const {
    tickets,
    selectedTicket,
    setTickets,
    selectTicket,
    filters,
    setFilters,
    isLoadingTickets,
    setLoadingTickets,
  } = useChatStore();

  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchTickets();
  }, [filters]);

  async function fetchTickets() {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.set("status", filters.status);
      if (filters.departmentId) params.set("departmentId", filters.departmentId);
      if (search) params.set("search", search);

      const response = await api.get<{ tickets: any[] }>(`/tickets?${params}`);
      setTickets(response.data.tickets);
    } catch (error) {
      console.error("Failed to fetch tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTickets();
  };

  return (
    <div className="w-80 border-r flex flex-col bg-card">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Conversas</h2>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </form>

        {/* Quick Filters */}
        <div className="flex gap-2 mt-3">
          <Button
            variant={filters.status === undefined ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ status: undefined })}
          >
            Todos
          </Button>
          <Button
            variant={filters.status === "PENDING" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ status: "PENDING" })}
          >
            Fila
          </Button>
          <Button
            variant={filters.status === "IN_PROGRESS" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilters({ status: "IN_PROGRESS" })}
          >
            Meus
          </Button>
        </div>
      </div>

      {/* Ticket List */}
      <ScrollArea className="flex-1">
        {isLoadingTickets ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <p>Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="divide-y">
            {tickets.map((ticket) => (
              <TicketItem
                key={ticket.id}
                ticket={ticket}
                isSelected={selectedTicket?.id === ticket.id}
                onSelect={() => selectTicket(ticket)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface TicketItemProps {
  ticket: any;
  isSelected: boolean;
  onSelect: () => void;
}

function TicketItem({ ticket, isSelected, onSelect }: TicketItemProps) {
  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);
  const initials = contactName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const lastMessage = ticket.messages?.[0];
  const sla = ticket.slaDeadline ? formatSLATime(ticket.slaDeadline) : null;

  return (
    <button
      className={cn(
        "w-full p-3 flex items-start gap-3 text-left hover:bg-muted/50 transition-colors",
        isSelected && "bg-muted"
      )}
      onClick={onSelect}
    >
      <div className="relative">
        <Avatar>
          <AvatarImage src={ticket.contact?.avatar} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {ticket.isAIHandled && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center">
            <Bot className="w-3 h-3 text-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="font-medium truncate">{contactName}</span>
          <span className="text-xs text-muted-foreground">
            {formatDate(ticket.updatedAt)}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          <span
            className={cn(
              "w-2 h-2 rounded-full",
              getStatusColor(ticket.status)
            )}
          />
          {ticket.department && (
            <span
              className="text-xs px-1.5 py-0.5 rounded"
              style={{ backgroundColor: ticket.department.color + "20" }}
            >
              {ticket.department.name}
            </span>
          )}
        </div>

        {lastMessage && (
          <p className="text-sm text-muted-foreground truncate">
            {lastMessage.isFromMe && "Você: "}
            {lastMessage.content || `[${lastMessage.type}]`}
          </p>
        )}

        {sla && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
          <div
            className={cn(
              "flex items-center gap-1 text-xs mt-1",
              sla.status === "ok" && "text-green-600",
              sla.status === "warning" && "text-yellow-600",
              sla.status === "critical" && "text-red-600",
              sla.status === "breached" && "text-red-600 font-bold"
            )}
          >
            <Clock className="w-3 h-3" />
            <span>SLA: {sla.text}</span>
          </div>
        )}
      </div>
    </button>
  );
}
