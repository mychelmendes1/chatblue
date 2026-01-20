"use client";

import { useState, useRef, useEffect } from "react";
import { Bot, X, Send, Minimize2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
import { usePageContext } from "./context-detector";

interface BlueChatProps {
  position: { x: number; y: number };
  onClose: () => void;
  onMinimize: () => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function BlueChat({ position, onClose, onMinimize }: BlueChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const context = usePageContext();

  // Auto focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll to bottom when new message arrives
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
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
      const response = await api.post<{ response: string }>("/blue/chat", {
        message: userMessage.content,
        context: context,
        history: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error("Error chatting with Blue:", error);
      let errorContent = "Desculpe, ocorreu um erro. Por favor, tente novamente.";
      
      if (error?.response?.status === 403) {
        if (error?.response?.data?.error?.includes("AI is not enabled")) {
          errorContent = "A IA não está configurada. Por favor, configure a IA nas configurações da empresa para usar o Blue.";
        } else if (error?.response?.data?.error?.includes("Blue assistant is disabled")) {
          errorContent = "O assistente Blue está desabilitado para esta empresa.";
        } else {
          errorContent = error?.response?.data?.error || errorContent;
        }
      } else if (error?.response?.status === 401) {
        errorContent = "Sua sessão expirou. Por favor, faça login novamente.";
      }
      
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Calculate chat position (above mascot or adjust if near edges)
  const chatX = Math.max(16, Math.min(position.x - 200, window.innerWidth - 416));
  const chatY = Math.max(16, position.y - 500);

  return (
    <div
      className="fixed z-50 w-96 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col"
      style={{
        left: `${chatX}px`,
        top: `${chatY}px`,
        height: "500px",
        maxHeight: "500px",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Blue</h3>
            <p className="text-xs text-muted-foreground">Assistente IA</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMinimize}
          >
            <Minimize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bot className="w-12 h-12 text-blue-600 mb-4" />
            <p className="text-sm text-muted-foreground">
              Olá! Eu sou o Blue, seu assistente IA.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Como posso ajudá-lo hoje?
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
                    ? "bg-blue-600 text-white"
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

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-gray-800 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pergunte ao Blue..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}




