"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Bot, X, Minimize2, Maximize2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BlueChat } from "./blue-chat";
import { BlueTips } from "./blue-tips";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";
import { usePageContext } from "./context-detector";

interface BlueMascotProps {
  className?: string;
}

type BlueState = "minimized" | "expanded" | "showing-tip";

export function BlueMascot({ className }: BlueMascotProps) {
  const { user } = useAuthStore();
  const pageContext = usePageContext();
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [state, setState] = useState<BlueState>("minimized");
  const [isVisible, setIsVisible] = useState(false); // Start as false, will be set after checking settings
  const [hasCheckedSettings, setHasCheckedSettings] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);
  const checkSettingsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if Blue is enabled for company (with debounce and memoization)
  useEffect(() => {
    // Clear any pending timeout
    if (checkSettingsTimeoutRef.current) {
      clearTimeout(checkSettingsTimeoutRef.current);
    }

    // Only check if we have a user and company, and haven't checked yet or company changed
    if (!user?.company?.id) {
      setIsVisible(false);
      setHasCheckedSettings(false);
      return;
    }

    // Debounce the check to avoid multiple rapid calls
    checkSettingsTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await api.get<{ blueEnabled: boolean; aiEnabled: boolean; aiProvider?: string; aiApiKey?: string }>("/settings");
        console.log("Blue settings response:", response.data);
        
        // Blue is visible only if:
        // 1. blueEnabled is true
        // 2. AI is enabled and configured (aiEnabled, aiProvider, and aiApiKey exist)
        const blueEnabled = response.data.blueEnabled === true;
        const aiConfigured = !!(response.data.aiEnabled === true && 
                             response.data.aiProvider && 
                             (response.data.aiApiKey || response.data.aiApiKey === '••••••••'));
        
        const enabled = blueEnabled && aiConfigured;
        console.log("Blue enabled:", enabled, { blueEnabled, aiConfigured });
        setIsVisible(Boolean(enabled));
        setHasCheckedSettings(true);
      } catch (error) {
        console.error("Failed to fetch company settings for Blue:", error);
        setIsVisible(false);
        setHasCheckedSettings(true);
      }
    }, 100); // Small debounce to avoid rapid calls

    return () => {
      if (checkSettingsTimeoutRef.current) {
        clearTimeout(checkSettingsTimeoutRef.current);
      }
    };
  }, [user?.company?.id]);

  // Load position from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem("blue-mascot-position");
    if (savedPosition) {
      try {
        const { x, y } = JSON.parse(savedPosition);
        setPosition({ x, y });
      } catch (e) {
        // Default position: bottom right
        setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
      }
    } else {
      // Default position: bottom right
      setPosition({ x: window.innerWidth - 80, y: window.innerHeight - 100 });
    }
  }, []);

  // Save position to localStorage
  const savePosition = useCallback((x: number, y: number) => {
    localStorage.setItem("blue-mascot-position", JSON.stringify({ x, y }));
  }, []);

  // Handle mouse down
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (state === "minimized" && mascotRef.current) {
      const rect = mascotRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, [state]);

  // Handle touch start
  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (state === "minimized" && mascotRef.current) {
      const touch = e.touches[0];
      const rect = mascotRef.current.getBoundingClientRect();
      setDragOffset({
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      });
      setIsDragging(true);
    }
  }, [state]);

  // Handle mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(window.innerWidth - 64, e.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 64, e.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
        savePosition(newX, newY);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragOffset, savePosition]);

  // Handle touch move
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) {
        const touch = e.touches[0];
        const newX = Math.max(0, Math.min(window.innerWidth - 64, touch.clientX - dragOffset.x));
        const newY = Math.max(0, Math.min(window.innerHeight - 64, touch.clientY - dragOffset.y));
        setPosition({ x: newX, y: newY });
        savePosition(newX, newY);
      }
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset, savePosition]);

  // Handle click on mascot
  const handleMascotClick = useCallback(() => {
    if (state === "minimized") {
      setState("expanded");
    } else if (state === "expanded") {
      setState("minimized");
    }
  }, [state]);

  // Handle close chat
  const handleCloseChat = useCallback(() => {
    setState("minimized");
  }, []);

  // Handle tip close
  const handleTipClose = useCallback(() => {
    setState("minimized");
  }, []);

  // Auto-show tips when page context changes
  useEffect(() => {
    if (pageContext && isVisible && state === "minimized") {
      // Show tip automatically after a delay when page changes
      const timer = setTimeout(() => {
        setState("showing-tip");
        // Auto-hide tip after 10 seconds
        setTimeout(() => {
          setState("minimized");
        }, 10000);
      }, 2000); // Wait 2 seconds before showing tip

      return () => clearTimeout(timer);
    }
  }, [pageContext?.route, isVisible, state]);

  if (!isVisible) return null;

  return (
    <>
      {/* Minimized mascot */}
      <div
        ref={mascotRef}
        className={cn(
          "fixed z-50 cursor-move select-none transition-transform",
          state === "minimized" ? "opacity-100" : "opacity-0 pointer-events-none",
          isDragging && "scale-110",
          className
        )}
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: isDragging ? "scale(1.1)" : undefined,
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onClick={handleMascotClick}
      >
        <div className="relative w-16 h-16 bg-blue-600 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group">
          <Bot className="w-8 h-8 text-white" />
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
        </div>
      </div>

      {/* Expanded chat */}
      {state === "expanded" && (
        <BlueChat
          position={position}
          onClose={handleCloseChat}
          onMinimize={() => setState("minimized")}
        />
      )}

      {/* Tip display */}
      {state === "showing-tip" && (
        <BlueTips
          position={position}
          onClose={handleTipClose}
        />
      )}
    </>
  );
}

