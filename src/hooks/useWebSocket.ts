// src/hooks/useWebSocket.ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type UseWebSocketOptions = {
  url: string;
  protocols?: string | string[];
  heartbeatIntervalMs?: number; // ping 주기
  pongTimeoutMs?: number; // pong 대기
  maxReconnectDelayMs?: number; // 백오프 상한
};

type ServerMessage<T = unknown> = {
  topic?: string; // 예: "prices", "news"
  payload?: T; // 서버 실데이터
  type?: string; // 선택: "pong" 같은 제어용
  [key: string]: any; // 확장
};

type ClientMessage =
  | { action: "subscribe"; topic: string }
  | { action: "unsubscribe"; topic: string }
  | { action: "ping" }
  | Record<string, any>;

type ConnectionStatus =
  | "idle"
  | "connecting"
  | "open"
  | "closing"
  | "closed"
  | "error";

export function useWebSocket({
  url,
  protocols,
  heartbeatIntervalMs = 30000,
  pongTimeoutMs = 5000,
  maxReconnectDelayMs = 30_000,
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");

  // topic -> latest payload
  const [dataByTopic, setDataByTopic] = useState<Record<string, unknown>>({});

  // 현재 구독 유지 (재연결 시 재전송)
  const subscriptionsRef = useRef<Set<string>>(new Set());

  // 하트비트
  const heartbeatTimerRef = useRef<number | null>(null);
  const pongTimerRef = useRef<number | null>(null);

  // 백오프
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<number | null>(null);
  const closedManuallyRef = useRef(false);

  const clearTimers = () => {
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (pongTimerRef.current) {
      window.clearTimeout(pongTimerRef.current);
      pongTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  };

  const sendRaw = useCallback((msg: ClientMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }, []);

  const subscribe = useCallback(
    (topic: string) => {
      subscriptionsRef.current.add(topic);

      sendRaw({
        action: "subscribe",
        topic,
        payload: {
          timestamp: Date.now(),
          message: `I'm here! Now Subscribed ${topic}`,
        },
      });
    },
    [sendRaw]
  );

  const unsubscribe = useCallback(
    (topic: string) => {
      subscriptionsRef.current.delete(topic);
      sendRaw({ action: "unsubscribe", topic });
      // UI상 최신값도 비워주고 싶다면 주석 해제
      // setDataByTopic((prev) => {
      //   const { [topic]: _, ...rest } = prev;
      //   return rest;
      // });
    },
    [sendRaw]
  );

  const startHeartbeat = useCallback(() => {
    // 주기적으로 ping
    heartbeatTimerRef.current = window.setInterval(() => {
      const ok = sendRaw({ action: "ping" });
      if (!ok) return;
      // pong 대기 타임아웃
      if (pongTimerRef.current) window.clearTimeout(pongTimerRef.current);
      pongTimerRef.current = window.setTimeout(() => {
        // pong 미수신 → 강제 재연결
        try {
          wsRef.current?.close();
        } catch {}
      }, pongTimeoutMs);
    }, heartbeatIntervalMs);
  }, [heartbeatIntervalMs, pongTimeoutMs, sendRaw]);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      window.clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (pongTimerRef.current) {
      window.clearTimeout(pongTimerRef.current);
      pongTimerRef.current = null;
    }
  }, []);

  const resubscribeAll = useCallback(() => {
    subscriptionsRef.current.forEach((topic) => {
      sendRaw({ action: "subscribe", topic });
    });
  }, [sendRaw]);

  const scheduleReconnect = useCallback(() => {
    if (closedManuallyRef.current) return;
    const attempt = reconnectAttemptRef.current + 1;
    reconnectAttemptRef.current = attempt;
    // 지수 백오프 (최대 maxReconnectDelayMs)
    const delay = Math.min(1000 * 2 ** (attempt - 1), maxReconnectDelayMs);
    reconnectTimerRef.current = window.setTimeout(() => {
      connect();
    }, delay);
  }, [maxReconnectDelayMs]);

  const connect = useCallback(() => {
    clearTimers();
    setStatus("connecting");
    try {
      wsRef.current = new WebSocket(url, protocols);
    } catch (e) {
      setStatus("error");
      scheduleReconnect();
      return;
    }

    const ws = wsRef.current;

    ws.onopen = () => {
      setStatus("open");
      reconnectAttemptRef.current = 0;
      startHeartbeat();
      resubscribeAll();
    };

    ws.onmessage = (ev) => {
      try {
        const msg: ServerMessage = JSON.parse(ev.data);
        // 하트비트 pong 처리
        if (msg.type === "pong") {
          if (pongTimerRef.current) {
            window.clearTimeout(pongTimerRef.current);
            pongTimerRef.current = null;
          }
          return;
        }
        // 표준 데이터 처리
        if (msg.topic) {
          setDataByTopic((prev) => ({ ...prev, [msg.topic!]: msg.payload }));
        }
      } catch {
        // 필요시 raw 텍스트 처리
      }
    };

    ws.onerror = () => {
      setStatus("error");
    };

    ws.onclose = () => {
      setStatus("closed");
      stopHeartbeat();
      if (!closedManuallyRef.current) scheduleReconnect();
    };
  }, [
    protocols,
    resubscribeAll,
    scheduleReconnect,
    startHeartbeat,
    stopHeartbeat,
    url,
  ]);

  const close = useCallback(() => {
    closedManuallyRef.current = true;
    try {
      wsRef.current?.close();
    } catch {}
    clearTimers();
    setStatus("closing");
  }, []);

  // 최초 연결
  useEffect(() => {
    closedManuallyRef.current = false;
    connect();
    return () => {
      close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, String(protocols)]);

  // select helper
  const select = useCallback(
    <T = unknown>(topic: string) => dataByTopic[topic] as T | undefined,
    [dataByTopic]
  );

  return useMemo(
    () => ({
      status,
      dataByTopic,
      select, // topic별 최신값 셀렉터
      subscribe,
      unsubscribe,
      send: sendRaw,
      close,
    }),
    [close, dataByTopic, select, sendRaw, status, subscribe, unsubscribe]
  );
}
