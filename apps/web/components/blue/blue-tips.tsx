"use client";

import { useState, useEffect } from "react";
import { Bot, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { usePageContext } from "./context-detector";

interface BlueTipsProps {
  position: { x: number; y: number };
  onClose: () => void;
}

export function BlueTips({ position, onClose }: BlueTipsProps) {
  const [tip, setTip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const context = usePageContext();

  useEffect(() => {
    const fetchTip = async () => {
      try {
        const response = await api.post<{ tip: string }>("/blue/context-tip", {
          context: context,
        });
        setTip(response.data.tip);
      } catch (error: any) {
        console.error("Error fetching tip:", error);
        // Only show error message if it's not a configuration issue
        if (error?.response?.status === 403 && error?.response?.data?.error?.includes("AI is not enabled")) {
          // Don't show tip if AI is not configured - this is expected
          setTip(null);
        } else {
          setTip("Não foi possível carregar a dica no momento.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (context) {
      fetchTip();
    } else {
      setIsLoading(false);
    }
  }, [context]);

  // Calculate tip position (above mascot)
  const tipX = Math.max(16, Math.min(position.x - 150, window.innerWidth - 316));
  const tipY = Math.max(16, position.y - 150);

  if (!isLoading && !tip) return null;

  return (
    <div
      className="fixed z-50 w-80 bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-800"
      style={{
        left: `${tipX}px`,
        top: `${tipY}px`,
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h4 className="font-semibold text-sm">Dica do Blue</h4>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando dica...</p>
        ) : (
          <p className="text-sm text-gray-700 dark:text-gray-300">{tip}</p>
        )}
      </div>
    </div>
  );
}




