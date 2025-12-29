"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore, type Message } from "@/stores/chat.store";
import { normalizeMediaUrl } from "@/utils/media-url.util";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { accessToken } = useAuthStore();

  // Use callbacks to always get latest store state
  const handleMessageReceived = useCallback((data: any) => {
    try {
      const store = useChatStore.getState();
      const message = data.message;
      const ticketId = message.ticketId || data.ticket?.id;
      
      console.log("[Socket] message:received", { ticketId, selectedTicketId: store.selectedTicket?.id });
      
      if (!ticketId || !message?.id) {
        console.log("[Socket] message:received - Invalid message or no ticketId, ignoring");
        return;
      }
      
      // Ensure message has ticketId and preserve quoted field
      const safeMessage = {
        ...message,
        ticketId: ticketId,
        // Normalize media URL
        mediaUrl: normalizeMediaUrl(message.mediaUrl),
        // Preserve quoted field if present
        quoted: message.quoted ? {
          ...message.quoted,
          mediaUrl: normalizeMediaUrl(message.quoted.mediaUrl),
        } : undefined,
        quotedId: message.quotedId,
      };
      
      // Add message to current conversation if it's selected
      if (store.selectedTicket && ticketId === store.selectedTicket.id) {
        store.addMessage(safeMessage);
      } else {
        // Update unread count for tickets in the sidebar
        store.updateTicketUnread(ticketId);
      }
      
      // Always update ticket in sidebar with new lastMessage
      store.updateTicket(ticketId, {
        lastMessage: safeMessage,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Socket] message:received - Error processing message:", error);
    }
  }, []);

  const handleMessageSent = useCallback((message: any) => {
    try {
      const store = useChatStore.getState();
      const ticketId = message.ticketId || message.ticket?.id;
      
      console.log("[Socket] message:sent", { 
        ticketId, 
        selectedTicketId: store.selectedTicket?.id,
        isMatch: store.selectedTicket?.id === ticketId,
        messageId: message.id,
        mediaUrl: message.mediaUrl 
      });
      
      if (!ticketId || !message?.id) {
        console.log("[Socket] message:sent - No ticketId or invalid message, ignoring");
        return;
      }
      
      // Ensure message has ticketId and preserve quoted field
      const safeMessage = {
        ...message,
        ticketId: ticketId,
        // Normalize media URL
        mediaUrl: normalizeMediaUrl(message.mediaUrl),
        // Preserve quoted field if present
        quoted: message.quoted ? {
          ...message.quoted,
          mediaUrl: normalizeMediaUrl(message.quoted.mediaUrl),
        } : undefined,
        quotedId: message.quotedId,
      };
      
      // Update or add message to current conversation if it's selected
      if (store.selectedTicket && ticketId === store.selectedTicket.id) {
        // Check if message already exists (was added when sent, now being updated with final URL)
        const existingMessage = store.messages.find((m) => m.id === message.id);
        if (existingMessage) {
          console.log("[Socket] message:sent - Updating existing message with final mediaUrl:", safeMessage.mediaUrl, "was:", existingMessage.mediaUrl);
          store.updateMessage(message.id, safeMessage);
        } else {
          console.log("[Socket] message:sent - Adding new message to conversation");
          store.addMessage(safeMessage);
        }
      } else {
        console.log("[Socket] message:sent - Ticket not selected, only updating sidebar");
      }
      
      // Always update ticket in sidebar with new lastMessage (for AI responses)
      store.updateTicket(ticketId, {
        lastMessage: {
          id: message.id,
          type: message.type || 'TEXT',
          content: message.content,
          isFromMe: true,
          isAIGenerated: false,
          status: 'SENT',
          createdAt: message.createdAt,
          ticketId: ticketId,
        } as Message,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Socket] message:sent - Error processing message:", error);
    }
  }, []);

  const handleMessageNew = useCallback((message: any) => {
    try {
      const store = useChatStore.getState();
      const ticketId = message?.ticketId;
      
      console.log("[Socket] message:new", { 
        ticketId, 
        selectedTicketId: store.selectedTicket?.id,
        isMatch: store.selectedTicket?.id === ticketId,
        messageId: message?.id,
        content: message?.content?.substring(0, 50),
        type: message?.type
      });
      
      if (!ticketId || !message?.id) {
        console.log("[Socket] message:new - Invalid message or no ticketId, ignoring");
        return;
      }
      
      // Ensure message has required fields
      const safeMessage = {
        ...message,
        ticketId: ticketId, // Ensure ticketId is set
        type: message.type || "TEXT",
        isFromMe: message.isFromMe ?? false,
        isAIGenerated: message.isAIGenerated ?? false,
        // Normalize media URL
        mediaUrl: normalizeMediaUrl(message.mediaUrl),
        // Normalize quoted message media URL if present (quoted may not have mediaUrl in type)
        quoted: message.quoted ? {
          ...message.quoted,
          ...((message.quoted as any).mediaUrl ? { mediaUrl: normalizeMediaUrl((message.quoted as any).mediaUrl) } : {}),
        } : undefined,
        status: message.status || "SENT",
        createdAt: message.createdAt || new Date().toISOString(),
        quotedId: message.quotedId,
      };
      
      // Add message to current conversation if it's selected
      if (store.selectedTicket && ticketId === store.selectedTicket.id) {
        console.log("[Socket] message:new - Adding message to conversation", safeMessage.id, "ticketId:", ticketId);
        // Force a state update by getting fresh state
        const currentMessages = store.messages;
        const messageExists = currentMessages.some((m) => m.id === safeMessage.id);
        console.log("[Socket] message:new - Message exists?", messageExists, "Current messages count:", currentMessages.length);
        if (!messageExists) {
          store.addMessage(safeMessage);
          // Verify it was added
          setTimeout(() => {
            const updatedMessages = store.messages;
            console.log("[Socket] message:new - Message added, new count:", updatedMessages.length, "Message in store?", updatedMessages.some((m) => m.id === safeMessage.id));
          }, 100);
        } else {
          console.log("[Socket] message:new - Message already exists, skipping");
        }
      } else {
        console.log("[Socket] message:new - Ticket not selected, message not added to view. Selected:", store.selectedTicket?.id, "Message ticket:", ticketId);
      }
    } catch (error) {
      console.error("[Socket] message:new - Error processing message:", error);
    }
  }, []);

  const handleTicketCreated = useCallback((ticket: any) => {
    console.log("[Socket] ticket:created", ticket);
    const store = useChatStore.getState();
    store.addTicket(ticket);
  }, []);

  const handleTicketUpdated = useCallback((data: any) => {
    try {
      console.log("[Socket] ticket:updated", data);
      const store = useChatStore.getState();
      
      // Check if this ticket is currently being viewed
      const isCurrentTicket = store.selectedTicket && store.selectedTicket.id === data.id;
      
      // Update the ticket with all received data
      store.updateTicket(data.id, {
        ...data,
        // Ensure lastMessage is properly set if provided
        ...(data.lastMessage && { lastMessage: data.lastMessage }),
      });
      
      // If this is the currently selected ticket, update the selection WITHOUT clearing messages
      if (isCurrentTicket) {
        // Use updateSelectedTicket instead of selectTicket to preserve messages
        store.updateSelectedTicket(data);
        console.log("[Socket] Updated selected ticket (preserving messages):", data.id);
      }
    } catch (error) {
      console.error("[Socket] ticket:updated - Error processing update:", error);
    }
  }, []);

  const handleTicketAssigned = useCallback(({ ticketId, assignedToId }: { ticketId: string; assignedToId: string }) => {
    console.log("[Socket] ticket:assigned", { ticketId, assignedToId });
    const store = useChatStore.getState();
    store.updateTicket(ticketId, { assignedToId } as any);
  }, []);

  const handleTicketTransferred = useCallback((data: any) => {
    console.log("[Socket] ticket:transferred", data);
    const store = useChatStore.getState();
    
    store.updateTicket(data.ticketId, {
      departmentId: data.departmentId,
      department: data.departmentName ? { 
        id: data.departmentId, 
        name: data.departmentName,
        color: null 
      } : undefined,
      status: "PENDING",
      assignedToId: null,
      isAIHandled: false,
      humanTakeoverAt: new Date().toISOString(),
    } as any);
  }, []);

  const handleTicketStatusChanged = useCallback((data: any) => {
    console.log("[Socket] ticket:statusChanged", data);
    const store = useChatStore.getState();
    
    store.updateTicket(data.ticketId, {
      status: data.status,
      departmentId: data.departmentId,
      department: data.departmentName ? {
        id: data.departmentId,
        name: data.departmentName,
        color: null,
      } : undefined,
      assignedToId: data.assignedToId,
      isAIHandled: data.isAIHandled,
    } as any);
  }, []);

  const handleMessageStatus = useCallback(({ messageId, status }: { messageId: string; status: string }) => {
    const store = useChatStore.getState();
    store.updateMessage(messageId, { status });
  }, []);

  const handleMessageReaction = useCallback(({ messageId, reactions }: { messageId: string; reactions: any[] }) => {
    const store = useChatStore.getState();
    store.updateMessage(messageId, { reactions });
  }, []);

  const handleMessageDeleted = useCallback(({ messageId, deletedAt }: { messageId: string; deletedAt: string }) => {
    const store = useChatStore.getState();
    store.updateMessage(messageId, { 
      deletedAt,
      content: "Esta mensagem foi apagada",
    });
  }, []);

  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      setSocket(null);
      setIsConnected(false);
      return;
    }

    const socketInstance = getSocket(accessToken);
    setSocket(socketInstance);

    socketInstance.on("connect", () => {
      console.log("[Socket] Connected with id:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("[Socket] Disconnected");
      setIsConnected(false);
    });
    
    // Debug: Log all incoming events
    socketInstance.onAny((eventName, ...args) => {
      console.log(`[Socket] Event received: ${eventName}`, args);
    });

    // Message events
    socketInstance.on("message:received", handleMessageReceived);
    socketInstance.on("message:sent", handleMessageSent);
    socketInstance.on("message:new", handleMessageNew);
    socketInstance.on("message:status", handleMessageStatus);
    socketInstance.on("message:reaction", handleMessageReaction);
    socketInstance.on("message:deleted", handleMessageDeleted);

    // Ticket events
    socketInstance.on("ticket:created", handleTicketCreated);
    socketInstance.on("ticket:updated", handleTicketUpdated);
    socketInstance.on("ticket:assigned", handleTicketAssigned);
    socketInstance.on("ticket:transferred", handleTicketTransferred);
    socketInstance.on("ticket:statusChanged", handleTicketStatusChanged);

    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.offAny();
      socketInstance.off("message:received", handleMessageReceived);
      socketInstance.off("message:sent", handleMessageSent);
      socketInstance.off("message:new", handleMessageNew);
      socketInstance.off("message:status", handleMessageStatus);
      socketInstance.off("message:reaction", handleMessageReaction);
      socketInstance.off("message:deleted", handleMessageDeleted);
      socketInstance.off("ticket:created", handleTicketCreated);
      socketInstance.off("ticket:updated", handleTicketUpdated);
      socketInstance.off("ticket:assigned", handleTicketAssigned);
      socketInstance.off("ticket:transferred", handleTicketTransferred);
      socketInstance.off("ticket:statusChanged", handleTicketStatusChanged);
    };
  }, [
    accessToken,
    handleMessageReceived,
    handleMessageSent,
    handleMessageNew,
    handleMessageStatus,
    handleMessageReaction,
    handleMessageDeleted,
    handleTicketCreated,
    handleTicketUpdated,
    handleTicketAssigned,
    handleTicketTransferred,
    handleTicketStatusChanged,
  ]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
