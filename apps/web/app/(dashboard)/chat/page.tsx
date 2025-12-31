"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { ContactInfo } from "@/components/chat/contact-info";
import { useChatStore, type Ticket } from "@/stores/chat.store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { selectedTicket, selectTicket, tickets, setTickets } = useChatStore();
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [isLoadingTicket, setIsLoadingTicket] = useState(false);
  // Mobile: track if we're viewing a conversation
  const [mobileShowChat, setMobileShowChat] = useState(false);

  // Handle ticket URL parameter
  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    
    if (ticketId && ticketId !== selectedTicket?.id) {
      setIsLoadingTicket(true);
      
      // First, check if ticket is already in the list
      const existingTicket = tickets.find(t => t.id === ticketId);
      
      if (existingTicket) {
        selectTicket(existingTicket);
        setMobileShowChat(true);
        setIsLoadingTicket(false);
        // Clear the URL parameter
        router.replace("/chat", { scroll: false });
      } else {
        // Fetch the ticket from API
        api.get(`/tickets/${ticketId}`)
          .then(response => {
            const ticket = response.data as Ticket;
            // Add to tickets list if not present
            setTickets([ticket, ...tickets.filter(t => t.id !== ticket.id)]);
            selectTicket(ticket);
            setMobileShowChat(true);
            // Clear the URL parameter
            router.replace("/chat", { scroll: false });
          })
          .catch(error => {
            console.error("Failed to load ticket:", error);
          })
          .finally(() => {
            setIsLoadingTicket(false);
          });
      }
    }
  }, [searchParams, selectedTicket?.id, tickets, selectTicket, setTickets, router]);

  // When a ticket is selected (from sidebar), show chat on mobile
  useEffect(() => {
    if (selectedTicket) {
      setMobileShowChat(true);
    }
  }, [selectedTicket?.id]);

  // Handle back button on mobile
  const handleMobileBack = () => {
    setMobileShowChat(false);
    selectTicket(null);
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Chat Sidebar - Lista de conversas */}
      {/* On mobile: hidden when viewing chat */}
      <div className={cn(
        "md:block h-full overflow-hidden",
        mobileShowChat ? "hidden" : "block w-full"
      )}>
        <ChatSidebar />
      </div>

      {/* Chat Window - Conversa principal */}
      {/* On mobile: full width when viewing chat */}
      <div className={cn(
        "flex-1 flex flex-col h-full overflow-hidden min-h-0",
        mobileShowChat ? "flex chat-container-mobile md:h-full" : "hidden md:flex"
      )}>
        {selectedTicket ? (
          <ChatWindow
            ticket={selectedTicket}
            onShowContactInfo={() => setShowContactInfo(true)}
            onMobileBack={handleMobileBack}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/50">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">Selecione uma conversa para começar</p>
              <p className="text-sm mt-2">
                As conversas aparecerão na lista à esquerda
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Contact Info Panel */}
      {showContactInfo && selectedTicket && (
        <ContactInfo
          ticket={selectedTicket}
          onClose={() => setShowContactInfo(false)}
        />
      )}
    </div>
  );
}

// Wrap with Suspense for useSearchParams
export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-full items-center justify-center">Carregando...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
