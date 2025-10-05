import { type ReactNode } from "react";
import { useWebSocket } from "../hooks/useWebSocket";
import { WebSocketContext } from "./WebSocketContext";

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = useWebSocket({
    url: "wss://echo.websocket.org",
    heartbeatIntervalMs: 30000,
    pongTimeoutMs: 5000,
  });

  return (
    <WebSocketContext.Provider value={ws}>{children}</WebSocketContext.Provider>
  );
}
