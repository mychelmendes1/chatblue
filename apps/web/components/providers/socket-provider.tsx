"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Socket } from "socket.io-client";
import { getSocket, disconnectSocket } from "@/lib/socket";
import { useAuthStore } from "@/stores/auth.store";
import { useChatStore } from "@/stores/chat.store";

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
  const { addMessage, updateTicket } = useChatStore();

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
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      setIsConnected(false);
    });

    // Handle incoming messages
    socketInstance.on("message:received", (data) => {
      addMessage(data.message);
    });

    socketInstance.on("message:sent", (message) => {
      addMessage(message);
    });

    socketInstance.on("message:status", ({ messageId, status }) => {
      // Update message status in store
    });

    // Handle ticket updates
    socketInstance.on("ticket:created", (ticket) => {
      // Add new ticket to list
    });

    socketInstance.on("ticket:updated", (ticket) => {
      updateTicket(ticket.id, ticket);
    });

    socketInstance.on("ticket:assigned", ({ ticketId, assignedToId }) => {
      updateTicket(ticketId, { assignedToId } as any);
    });

    socketInstance.on("ticket:transferred", (data) => {
      // Handle transfer
    });

    return () => {
      socketInstance.off("connect");
      socketInstance.off("disconnect");
      socketInstance.off("message:received");
      socketInstance.off("message:sent");
      socketInstance.off("message:status");
      socketInstance.off("ticket:created");
      socketInstance.off("ticket:updated");
      socketInstance.off("ticket:assigned");
      socketInstance.off("ticket:transferred");
    };
  }, [accessToken, addMessage, updateTicket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
