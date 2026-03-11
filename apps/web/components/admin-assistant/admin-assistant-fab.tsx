"use client";

import { useState } from "react";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminAssistantChat } from "./admin-assistant-chat";

export function AdminAssistantFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen((v) => !v)}
        size="icon"
        className="fixed bottom-6 left-6 z-40 h-12 w-12 rounded-full shadow-lg bg-amber-600 hover:bg-amber-700 text-white"
        title="Assistente de monitoramento"
      >
        <BarChart3 className="h-6 w-6" />
      </Button>
      {open && (
        <AdminAssistantChat onClose={() => setOpen(false)} />
      )}
    </>
  );
}
