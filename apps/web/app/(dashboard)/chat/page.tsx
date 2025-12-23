"use client";

import { useState } from "react";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatWindow } from "@/components/chat/chat-window";
import { ContactInfo } from "@/components/chat/contact-info";
import { useChatStore } from "@/stores/chat.store";

export default function ChatPage() {
  const { selectedTicket } = useChatStore();
  const [showContactInfo, setShowContactInfo] = useState(false);

  return (
    <div className="flex h-full">
      {/* Chat Sidebar - Lista de conversas */}
      <ChatSidebar />

      {/* Chat Window - Conversa principal */}
      <div className="flex-1 flex flex-col">
        {selectedTicket ? (
          <ChatWindow
            ticket={selectedTicket}
            onShowContactInfo={() => setShowContactInfo(true)}
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
