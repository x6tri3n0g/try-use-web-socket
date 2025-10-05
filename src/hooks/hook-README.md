# 🛰️ useWebSocket Hook

> React 환경에서 안정적인 **WebSocket 연결 관리**를 위한 경량형 커스텀 훅입니다.  
> 하트비트(heartbeat), 지수 백오프 재연결, 토픽 기반 데이터 관리 등을 지원합니다.

---

## ✨ 주요 기능

- 🔁 **자동 재연결**: 지수 백오프 방식 (1s → 2s → 4s … 최대 지연 제한)
- 💓 **하트비트(ping/pong)**: 서버 연결 상태 모니터링
- 🧠 **토픽 기반 데이터 관리**: 구독 주제별 최신 데이터 캐시
- 🔌 **간결한 API**: `subscribe`, `unsubscribe`, `send`, `select`, `close`
- ⚙️ **설정 가능 옵션**: 재연결/하트비트 주기 조정 가능
- 🪶 **의존성 없음**: 순수 TypeScript + 브라우저 WebSocket API만 사용

---

## 📦 설치 방법

별도의 패키지 설치가 필요하지 않습니다.  
`src/hooks/useWebSocket.ts` 파일을 그대로 프로젝트에 추가하세요.

---

## 🧠 사용 방법

```ts
const {
  status, // 현재 연결 상태 ("idle" | "connecting" | "open" | "closing" | "closed" | "error")
  dataByTopic, // 토픽별 최신 데이터
  select, // (topic) => 해당 토픽의 최신 데이터 반환
  subscribe, // (topic) => 서버에 구독 요청
  unsubscribe, // (topic) => 구독 해제 요청
  send, // (msg) => JSON 메시지 전송
  close, // () => 수동 종료
} = useWebSocket(options);
```

### 옵션 설명

| 옵션                  | 타입                 | 기본값  | 설명                                        |
| --------------------- | -------------------- | ------- | ------------------------------------------- |
| `url`                 | `string`             | —       | WebSocket 서버 주소 (`ws://` 또는 `wss://`) |
| `protocols`           | `string \| string[]` | —       | 서브프로토콜 (예: JWT 토큰)                 |
| `heartbeatIntervalMs` | `number`             | `30000` | ping을 보내는 주기(ms)                      |
| `pongTimeoutMs`       | `number`             | `5000`  | pong 응답 대기 시간(ms)                     |
| `maxReconnectDelayMs` | `number`             | `30000` | 재연결 최대 지연(ms)                        |

---

## 🧩 예제 코드

```tsx
import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";

export default function Dashboard() {
  const { status, select, subscribe, unsubscribe, send } = useWebSocket({
    url: "wss://api.example.com/stream",
    heartbeatIntervalMs: 30000,
    pongTimeoutMs: 5000,
    maxReconnectDelayMs: 20000,
  });

  useEffect(() => {
    subscribe("prices");
    subscribe("news");
    return () => {
      unsubscribe("prices");
      unsubscribe("news");
    };
  }, [subscribe, unsubscribe]);

  const price = select<{ symbol: string; price: number }>("prices");
  const news = select<{ title: string }>("news");

  return (
    <section>
      <p>연결 상태: {status}</p>
      <div>시세: {price ? `${price.symbol} ${price.price}` : "로딩 중..."}</div>
      <div>뉴스: {news ? news.title : "뉴스 없음"}</div>
      <button onClick={() => send({ action: "ping" })}>Ping 보내기</button>
    </section>
  );
}
```

---

## 🔄 연결 동작 흐름

```text
connect()
  ↓
onopen → startHeartbeat() → resubscribeAll()
  ↓
onmessage → dataByTopic 업데이트 / pong 처리
  ↓
ping 주기마다 {action:"ping"} 전송
  ↓
pongTimeoutMs 초과 시 ws.close()
  ↓
onclose → scheduleReconnect() (지수 백오프 재연결)
```

---

## ⚙️ 내부 동작 구조

| 구성 요소             | 역할                                               |
| --------------------- | -------------------------------------------------- |
| `wsRef`               | WebSocket 인스턴스 참조                            |
| `status`              | 연결 상태 관리 (`idle → open → closed` 등)         |
| `dataByTopic`         | 토픽별 최신 데이터 캐시                            |
| `subscriptionsRef`    | 현재 구독 중인 토픽 집합                           |
| `heartbeatTimerRef`   | 주기적 ping 타이머                                 |
| `pongTimerRef`        | pong 응답 대기 타이머                              |
| `reconnectAttemptRef` | 재연결 시도 횟수 저장                              |
| `reconnectTimerRef`   | 재연결 예약 타이머                                 |
| `closedManuallyRef`   | 사용자가 직접 닫았는지 여부 (true면 자동 재연결 X) |

---

## 🧩 주요 타입

```ts
type ServerMessage<T = unknown> = {
  topic?: string;
  payload?: T;
  type?: string; // 예: "pong"
  [key: string]: any;
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
```

---

## 💡 장점

- ✅ 단일 파일로 쉽게 재사용 가능
- ✅ 자동 재연결 및 자동 재구독
- ✅ 토픽 기반 데이터 캐시 (UI 연동 용이)
- ✅ 클린업/타이머 관리 완벽
- ✅ 타입 안정성 (TypeScript 완전 지원)

---

## ⚠️ 제한 사항 및 주의점

| 제한 사항           | 설명                                                               |
| ------------------- | ------------------------------------------------------------------ |
| **전송 큐 없음**    | 연결이 열려 있지 않으면 메시지가 유실됩니다. 필요 시 큐 추가 가능. |
| **pong 형식 고정**  | 서버에서 `{ type: "pong" }` 응답을 반환해야 합니다.                |
| **고빈도 메시지**   | 초당 수백 건 이상의 메시지는 성능 저하 가능 → throttling 필요.     |
| **클라이언트 전용** | `window` 객체 사용 → SSR 환경에서는 사용할 수 없습니다.            |

---

## 🚀 개선 예정 항목

- [ ] 전송 큐 추가 및 재전송 지원
- [ ] 사용자 정의 `isPong` 판별 콜백
- [ ] 이벤트 콜백(`onOpen`, `onClose`, `onMessage`, `onError`) 추가
- [ ] 바이너리 메시지(`ArrayBuffer`) 지원
- [ ] 토픽-페이로드 타입 매핑 (`useWebSocket<TopicMap>()`)
- [ ] 업데이트 배치 처리(`throttle`, `debounce`)

---

## 🧪 디버깅 팁

- Chrome DevTools → **Network → WS 탭**에서 프레임 확인
- `status` 상태 로그로 연결 흐름 점검 (`idle → connecting → open → closed`)
- 네트워크 연결 끊기 → 자동 재연결 테스트
- 서버 RTT에 따라 `heartbeatIntervalMs`, `pongTimeoutMs` 조정
- 메모리 누수 확인: 언마운트 시 `clearInterval` / `clearTimeout` 해제 확인

---

## 📜 라이선스

MIT © 2025 Hyun Hwang  
자유롭게 수정 및 사용 가능합니다.
