"use client";

import { Bot, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatPhone } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface KanbanTicket {
  id: string;
  protocol: string;
  status: string;
  priority: string;
  isAIHandled: boolean;
  createdAt: string;
  updatedAt: string;
  contact: {
    id: string;
    name?: string;
    phone: string;
    avatar?: string;
  };
  assignedTo?: {
    id: string;
    name: string;
    avatar?: string;
    isAI: boolean;
  } | null;
  department?: {
    id: string;
    name: string;
    color?: string;
  } | null;
  _count?: {
    messages: number;
  };
}

interface KanbanCardProps {
  ticket: KanbanTicket;
  isDragging?: boolean;
}

export function KanbanCard({ ticket, isDragging }: KanbanCardProps) {
  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);
  const initials = contactName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = formatDistanceToNow(new Date(ticket.createdAt), {
    addSuffix: false,
    locale: ptBR,
  });

  const isWithAI = ticket.isAIHandled && ticket.assignedTo?.isAI;

  return (
    <div
      className={`
        p-3 bg-card border rounded-lg cursor-grab
        hover:shadow-md transition-all
        ${isDragging ? "shadow-lg ring-2 ring-primary rotate-2" : ""}
      `}
    >
      {/* Header: Avatar + Nome */}
      <div className="flex items-start gap-3 mb-2">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={ticket.contact?.avatar} />
          <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-medium text-sm truncate">{contactName}</span>
            {isWithAI && (
              <Bot className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" title="Atendido por IA" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {formatPhone(ticket.contact?.phone)}
          </p>
        </div>
      </div>

      {/* Tags: Setor + Atendente */}
      <div className="flex flex-wrap gap-1 mb-2">
        {ticket.department && (
          <Badge
            variant="outline"
            className="text-xs px-1.5 py-0"
            style={{
              borderColor: ticket.department.color || undefined,
              color: ticket.department.color || undefined,
            }}
          >
            {ticket.department.name}
          </Badge>
        )}
      </div>

      {/* Footer: Atendente + Tempo */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          {ticket.assignedTo && !ticket.assignedTo.isAI ? (
            <>
              <User className="h-3 w-3" />
              <span className="truncate max-w-[80px]">{ticket.assignedTo.name}</span>
            </>
          ) : isWithAI ? (
            <>
              <Bot className="h-3 w-3 text-blue-500" />
              <span>IA</span>
            </>
          ) : (
            <span className="text-orange-500">Sem atendente</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          <span>{timeAgo}</span>
        </div>
      </div>
    </div>
  );
}
