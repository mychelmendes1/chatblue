"use client";

import { useEffect, useState } from "react";
import { Wifi, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConnectionTagProps {
  connectionName?: string;
  connectionType?: string;
  lastMessageAt?: string;
  /** Compact mode for smaller cards (kanban) */
  compact?: boolean;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expirada";
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }
  return `${minutes}m`;
}

function getWindowStatus(lastMessageAt: string): {
  isOpen: boolean;
  remaining: number;
  text: string;
} {
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const expiresAt = new Date(lastMessageAt).getTime() + WINDOW_MS;
  const now = Date.now();
  const remaining = expiresAt - now;
  const isOpen = remaining > 0;
  return {
    isOpen,
    remaining,
    text: isOpen ? formatCountdown(remaining) : "Expirada",
  };
}

export function ConnectionTag({
  connectionName,
  connectionType,
  lastMessageAt,
  compact = false,
}: ConnectionTagProps) {
  const isMetaCloud = connectionType === "META_CLOUD";

  const [windowInfo, setWindowInfo] = useState<{
    isOpen: boolean;
    remaining: number;
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!isMetaCloud || !lastMessageAt) {
      setWindowInfo(null);
      return;
    }

    const update = () => setWindowInfo(getWindowStatus(lastMessageAt));
    update();

    const interval = setInterval(update, 60 * 1000);
    return () => clearInterval(interval);
  }, [isMetaCloud, lastMessageAt]);

  if (!connectionName) return null;

  const isWarning = windowInfo && !windowInfo.isOpen;
  const isUrgent = windowInfo && windowInfo.isOpen && windowInfo.remaining < 2 * 60 * 60 * 1000; // < 2h

  return (
    <span className="inline-flex items-center gap-1 flex-shrink-0">
      {/* Connection name badge */}
      <Badge
        variant="outline"
        className={cn(
          "font-normal gap-1",
          compact ? "text-[10px] px-1 py-0" : "text-[10px] md:text-xs px-1 md:px-1.5 py-0.5"
        )}
      >
        <Wifi className={cn(compact ? "w-2.5 h-2.5" : "w-2.5 h-2.5 md:w-3 md:h-3")} />
        <span className="truncate max-w-[80px]">{connectionName}</span>
      </Badge>

      {/* 24h countdown - only for META_CLOUD */}
      {isMetaCloud && windowInfo && (
        <Badge
          variant="outline"
          className={cn(
            "font-normal gap-0.5",
            compact ? "text-[10px] px-1 py-0" : "text-[10px] md:text-xs px-1 md:px-1.5 py-0.5",
            windowInfo.isOpen && !isUrgent && "border-green-500 text-green-600 dark:text-green-400",
            isUrgent && "border-orange-500 text-orange-600 dark:text-orange-400",
            isWarning && "border-red-500 text-red-600 dark:text-red-400"
          )}
        >
          {isWarning ? (
            <AlertTriangle className={cn(compact ? "w-2.5 h-2.5" : "w-2.5 h-2.5 md:w-3 md:h-3")} />
          ) : (
            <Clock className={cn(compact ? "w-2.5 h-2.5" : "w-2.5 h-2.5 md:w-3 md:h-3")} />
          )}
          <span>{windowInfo.text}</span>
        </Badge>
      )}
    </span>
  );
}
