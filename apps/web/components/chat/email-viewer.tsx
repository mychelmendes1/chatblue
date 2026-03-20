"use client";

import { useEffect, useState } from "react";
import { X, Mail, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function EmailViewer() {
  const [open, setOpen] = useState(false);
  const [html, setHtml] = useState("");

  useEffect(() => {
    function onOpen(e: CustomEvent<{ html: string }>) {
      setHtml(e.detail.html || "");
      setOpen(true);
    }

    window.addEventListener("open-email-viewer", onOpen as EventListener);
    return () => window.removeEventListener("open-email-viewer", onOpen as EventListener);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              Email completo
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900">
          {html ? (
            <iframe
              srcDoc={html}
              sandbox="allow-same-origin"
              className="w-full min-h-[500px] h-full border-0"
              title="Email content"
              style={{ background: "#fff" }}
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              Sem conteúdo HTML disponível
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
