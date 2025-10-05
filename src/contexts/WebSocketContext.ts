import { createContext } from "react";
import type { useWebSocket } from "../hooks/useWebSocket";

export const WebSocketContext = createContext<ReturnType<
  typeof useWebSocket
> | null>(null);
