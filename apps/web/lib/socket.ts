import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

let socket: Socket | null = null;
let currentToken: string | null = null;

export const getSocket = (token: string): Socket => {
  // If token changed (company switch), force reconnect
  if (socket && currentToken !== token) {
    console.log("Token changed, reconnecting socket...");
    socket.disconnect();
    socket = null;
  }

  if (!socket) {
    currentToken = token;
    socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
    });

    socket.on("connect", () => {
      console.log("[Socket] Connected with id:", socket?.id);
      // Emit a custom event to notify that socket is ready
      socket?.emit("socket:ready");
    });

    socket.on("disconnect", (reason) => {
      console.log("[Socket] Disconnected, reason:", reason);
      // If disconnect was not intentional, try to reconnect
      if (reason === "io server disconnect" && socket) {
        // Server disconnected, reconnect manually
        socket.connect();
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("[Socket] Reconnected after", attemptNumber, "attempts");
      // Emit ready event after reconnection
      socket?.emit("socket:ready");
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("[Socket] Reconnection attempt", attemptNumber);
    });

    socket.on("reconnect_error", (error) => {
      console.error("[Socket] Reconnection error:", error);
    });

    socket.on("reconnect_failed", () => {
      console.error("[Socket] Reconnection failed");
    });

    socket.on("connect_error", (error) => {
      console.error("[Socket] Connection error:", error);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
};

// Force reconnect with new token
export const reconnectSocket = (token: string): Socket => {
  disconnectSocket();
  return getSocket(token);
};
