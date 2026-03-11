"use client";

import { useState, useRef, useEffect } from "react";
import { BarChart3, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";

interface AdminAssistantChatProps {
  onClose: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function AdminAssistantChat({ onClose }: AdminAssistantChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      ) as HTMLElement;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await api.post<{ response: string }>(
        "/admin-assistant/chat",
        {
          message: userMessage.content,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const err = error as { response?: { status?: number; data?: { error?: string } } };
      let errorContent =
        "Desculpe, ocorreu um erro. Por favor, tente novamente.";
      if (err?.response?.status === 403) {
        errorContent =
          err?.response?.data?.error ||
          "Configure a chave da API OpenAI (Whisper) nas configurações da empresa para usar o assistente de monitoramento.";
      } else if (err?.response?.status === 401) {
        errorContent = "Sua sessão expirou. Por favor, faça login novamente.";
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div
      className="fixed z-50 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col"
      style={{
        left: "24px",
        bottom: "100px",
        height: "500px",
        maxHeight: "500px",
      }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Monitoramento</h3>
            <p className="text-xs text-muted-foreground">
              Assistente para admins
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="w-12 h-12 text-amber-600 mb-4" />
              <p className="text-sm text-muted-foreground">
                Pergunte sobre atendimentos de hoje, follow-ups por atendente,
                prazos de atendimento (SLA), quem está online, etc.
              </p>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                    message.role === "user"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <form
        onSubmit={handleSend}
        className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0"
      >
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: Quantos atendimentos novos hoje?"
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
