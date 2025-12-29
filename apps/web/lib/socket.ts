import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

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
    });

    socket.on("connect", () => {
      console.log("Socket connected");
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
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
