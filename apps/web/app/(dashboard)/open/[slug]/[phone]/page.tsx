"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

export default function OpenConversationPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;
  const phone = params.phone as string;

  const { user, companies, switchCompany } = useAuthStore();

  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const hasRun = useRef(false);

  useEffect(() => {
    if (!slug || !phone) {
      setStatus("error");
      setErrorMessage("Link inválido. Verifique o formato do link.");
      return;
    }

    if (!user || hasRun.current) return;
    hasRun.current = true;

    async function openConversation() {
      try {
        // Check if we need to switch company based on slug
        const currentSlug = user!.company?.slug || user!.activeCompany?.slug;
        if (currentSlug !== slug) {
          // Find company by slug in user's companies list
          const targetCompany = companies.find(
            (c) => c.slug === slug
          );
          if (!targetCompany) {
            setStatus("error");
            setErrorMessage(
              `Você não tem acesso à empresa "${slug}". Verifique se está logado com a conta correta.`
            );
            return;
          }
          // Switch to the target company first
          await switchCompany(targetCompany.id);
          // Small delay to let the token propagate
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        const response = await api.post<{
          ticketId: string;
          contactId: string;
          isNew: boolean;
        }>("/tickets/open-by-phone", { phone });

        // Redirect to chat with the ticket
        router.replace(`/chat?ticket=${response.data.ticketId}`);
      } catch (error: any) {
        console.error("Failed to open conversation:", error);
        const message =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Não foi possível abrir a conversa.";
        setStatus("error");
        setErrorMessage(message);
      }
    }

    openConversation();
  }, [slug, phone, router, user, companies, switchCompany]);

  if (status === "error") {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <h2 className="text-lg font-semibold">Erro ao abrir conversa</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => router.push("/chat")}>
                <MessageSquare className="w-4 h-4 mr-2" />
                Ir para o Chat
              </Button>
              <Button
                onClick={async () => {
                  setStatus("loading");
                  setErrorMessage("");
                  hasRun.current = false;
                  try {
                    // Re-check company switch
                    const currentSlug = user?.company?.slug || user?.activeCompany?.slug;
                    if (currentSlug !== slug) {
                      const targetCompany = companies.find((c) => c.slug === slug);
                      if (targetCompany) {
                        await switchCompany(targetCompany.id);
                        await new Promise((resolve) => setTimeout(resolve, 500));
                      }
                    }
                    const res = await api.post<{ ticketId: string }>("/tickets/open-by-phone", { phone });
                    router.replace(`/chat?ticket=${res.data.ticketId}`);
                  } catch {
                    setStatus("error");
                    setErrorMessage("Falha ao tentar novamente.");
                  }
                }}
              >
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-primary" />
      <p className="text-muted-foreground text-sm">
        Abrindo conversa com {phone}...
      </p>
    </div>
  );
}
