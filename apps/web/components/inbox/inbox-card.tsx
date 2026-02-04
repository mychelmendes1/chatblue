"use client";

import { Bot, Phone, Clock, MessageSquare, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn, formatPhone } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface InboxTicket {
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

interface InboxCardProps {
  ticket: InboxTicket;
  onAtender: (ticketId: string) => Promise<void>;
  isAtendendo?: boolean;
}

export function InboxCard({ ticket, onAtender, isAtendendo }: InboxCardProps) {
  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);
  const initials = contactName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const timeAgo = formatDistanceToNow(new Date(ticket.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });

  const messageCount = ticket._count?.messages || 0;
  const isWithAI = ticket.isAIHandled && ticket.assignedTo?.isAI;

  return (
    <div className="flex items-center gap-4 p-4 bg-card border rounded-lg hover:shadow-md transition-shadow">
      {/* Avatar */}
      <Avatar className="h-12 w-12 flex-shrink-0">
        <AvatarImage src={ticket.contact?.avatar} />
        <AvatarFallback className="bg-primary/10 text-primary font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>

      {/* Info Principal */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground truncate">
            {contactName}
          </span>
          {isWithAI && (
            <Bot className="h-4 w-4 text-blue-500 flex-shrink-0" title="Atendido por IA" />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          <Phone className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">{formatPhone(ticket.contact?.phone)}</span>
        </div>
      </div>

      {/* Setor */}
      {ticket.department && (
        <div className="hidden sm:block flex-shrink-0">
          <Badge
            variant="outline"
            style={{
              borderColor: ticket.department.color || undefined,
              color: ticket.department.color || undefined,
            }}
          >
            {ticket.department.name}
          </Badge>
        </div>
      )}

      {/* Mensagens */}
      <div className="hidden md:flex items-center gap-1 flex-shrink-0">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary" className="font-mono">
          {messageCount}
        </Badge>
      </div>

      {/* Tempo */}
      <div className="hidden lg:flex items-center gap-1 text-sm text-muted-foreground flex-shrink-0">
        <Clock className="h-4 w-4" />
        <span className="whitespace-nowrap">{timeAgo}</span>
      </div>

      {/* Botão Atender */}
      <Button
        onClick={() => onAtender(ticket.id)}
        disabled={isAtendendo}
        className="flex-shrink-0"
        size="sm"
      >
        {isAtendendo ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Atendendo...
          </>
        ) : (
          "Atender"
        )}
      </Button>
    </div>
  );
}
