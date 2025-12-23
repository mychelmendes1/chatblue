"use client";

import { useEffect, useRef, useState } from "react";
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Send,
  Smile,
  Bot,
  UserPlus,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, formatPhone, getStatusLabel } from "@/lib/utils";
import { useChatStore } from "@/stores/chat.store";
import { useSocket } from "@/components/providers/socket-provider";
import { api } from "@/lib/api";

interface ChatWindowProps {
  ticket: any;
  onShowContactInfo: () => void;
}

export function ChatWindow({ ticket, onShowContactInfo }: ChatWindowProps) {
  const { messages, setMessages, addMessage, setLoadingMessages } = useChatStore();
  const { socket } = useSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const contactName = ticket.contact?.name || formatPhone(ticket.contact?.phone);

  useEffect(() => {
    fetchMessages();

    // Join ticket room for real-time updates
    if (socket) {
      socket.emit("ticket:join", ticket.id);
    }

    return () => {
      if (socket) {
        socket.emit("ticket:leave", ticket.id);
      }
    };
  }, [ticket.id, socket]);

  useEffect(() => {
    // Scroll to bottom on new messages
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages() {
    setLoadingMessages(true);
    try {
      const response = await api.get<{ messages: any[] }>(`/messages/ticket/${ticket.id}`);
      setMessages(response.data.messages);
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const response = await api.post<any>(`/messages/ticket/${ticket.id}`, {
        content: newMessage.trim(),
        type: "TEXT",
      });
      addMessage(response.data);
      setNewMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsSending(false);
    }
  }

  async function handleTakeover() {
    try {
      await api.post(`/tickets/${ticket.id}/takeover`);
    } catch (error) {
      console.error("Failed to takeover:", error);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 cursor-pointer" onClick={onShowContactInfo}>
            <AvatarImage src={ticket.contact?.avatar} />
            <AvatarFallback>
              {contactName
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium">{contactName}</h3>
              {ticket.isAIHandled && (
                <span className="flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                  <Bot className="w-3 h-3" />
                  IA
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {ticket.contact?.phone} • {getStatusLabel(ticket.status)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {ticket.isAIHandled && (
            <Button onClick={handleTakeover} variant="default" size="sm">
              <UserPlus className="w-4 h-4 mr-2" />
              Assumir
            </Button>
          )}
          <Button variant="ghost" size="icon">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onShowContactInfo}>
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 bg-muted/30" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
      </ScrollArea>

      {/* Input */}
      <form
        onSubmit={handleSendMessage}
        className="flex items-center gap-2 p-4 border-t bg-card"
      >
        <Button type="button" variant="ghost" size="icon">
          <Smile className="w-5 h-5" />
        </Button>
        <Button type="button" variant="ghost" size="icon">
          <Paperclip className="w-5 h-5" />
        </Button>
        <Input
          placeholder="Digite uma mensagem..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || isSending}>
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}

function MessageBubble({ message }: { message: any }) {
  const isFromMe = message.isFromMe;
  const time = new Date(message.createdAt).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex",
        isFromMe ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "message-bubble",
          isFromMe ? "message-bubble-sent" : "message-bubble-received"
        )}
      >
        {message.isAIGenerated && (
          <div className="flex items-center gap-1 text-xs text-purple-600 mb-1">
            <Bot className="w-3 h-3" />
            <span>IA</span>
          </div>
        )}

        {message.type === "TEXT" && (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}

        {message.type === "IMAGE" && (
          <img
            src={message.mediaUrl}
            alt=""
            className="max-w-[300px] rounded-md"
          />
        )}

        {message.type === "AUDIO" && (
          <audio controls src={message.mediaUrl} className="max-w-[300px]" />
        )}

        {message.type === "DOCUMENT" && (
          <a
            href={message.mediaUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            📄 {message.content || "Documento"}
          </a>
        )}

        <div
          className={cn(
            "flex items-center gap-1 mt-1",
            isFromMe ? "justify-end" : "justify-start"
          )}
        >
          <span className="text-xs text-muted-foreground">{time}</span>
          {isFromMe && (
            <span className="text-muted-foreground">
              {message.status === "READ" ? (
                <CheckCheck className="w-4 h-4 text-blue-500" />
              ) : message.status === "DELIVERED" ? (
                <CheckCheck className="w-4 h-4" />
              ) : (
                <Check className="w-4 h-4" />
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
