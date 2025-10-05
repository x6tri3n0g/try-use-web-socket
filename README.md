# WebSocket Hook for React

React에서 사용할 수 있는 WebSocket 커스텀 훅과 컨텍스트 프로바이더 구현체입니다. 실시간 데이터 처리, 자동 재연결, 하트비트 체크 등의 기능을 제공합니다.

## 개발 환경

- Node.js
- React 18
- TypeScript 5
- Vite
- ESLint
- WebSocket API

## 설치 및 실행

1. 프로젝트 클론

```bash
git clone [repository-url]
cd web-socket-hook
```

2. 의존성 설치

```bash
npm install
```

3. 개발 서버 실행

```bash
npm run dev
```

## 주요 컴포넌트

### useWebSocket Hook

`src/hooks/useWebSocket.ts`는 WebSocket 연결을 관리하는 커스텀 훅입니다.

#### 주요 기능

- WebSocket 연결 생성 및 관리
- 자동 재연결 (exponential backoff)
- 하트비트 체크 (ping/pong)
- 구독 관리 시스템
- 연결 상태 모니터링

#### 사용 예시

```typescript
const {
  status, // 연결 상태 ('idle' | 'connecting' | 'open' | 'closing' | 'closed' | 'error')
  subscribe, // 토픽 구독
  unsubscribe, // 구독 해제
  select, // 토픽별 데이터 선택
  send, // 메시지 전송
  close, // 연결 종료
} = useWebSocket({
  url: "wss://your-server",
  heartbeatIntervalMs: 30000, // 30초
  pongTimeoutMs: 5000, // 5초
  maxReconnectDelayMs: 30000, // 최대 재연결 대기 시간
});
```

### WebSocket Context Provider

`src/contexts/WebSocketProvider.tsx`와 관련 파일들은 애플리케이션 전역에서 단일 WebSocket 인스턴스를 공유하기 위한 컨텍스트 프로바이더입니다.

#### 구성 파일

- `WebSocketContext.ts`: 컨텍스트 정의
- `WebSocketProvider.tsx`: 프로바이더 컴포넌트
- `useWebSocketContext.ts`: 컨텍스트 사용을 위한 커스텀 훅

#### 필요성

1. **단일 연결 유지**: 여러 컴포넌트에서 동일한 WebSocket 연결을 공유하여 리소스 효율성 증가
2. **상태 공유**: 연결 상태와 데이터를 컴포넌트 트리 전체에서 공유
3. **구독 관리**: 중복 구독 방지 및 효율적인 메시지 라우팅

#### 사용 예시

```typescript
// App.tsx
function App() {
  return (
    <WebSocketProvider>
      <YourComponents />
    </WebSocketProvider>
  );
}

// 자식 컴포넌트
function YourComponent() {
  const { status, subscribe, select } = useWebSocketContext();

  useEffect(() => {
    subscribe("your-topic");
    return () => unsubscribe("your-topic");
  }, [subscribe, unsubscribe]);

  const data = select("your-topic");
  // ... 데이터 사용
}
```

## 메시지 타입

### 서버 메시지 (ServerMessage)

```typescript
type ServerMessage<T = unknown> = {
  topic?: string; // 메시지 토픽 (예: "prices", "news")
  payload?: T; // 실제 데이터
  type?: string; // 제어 메시지 타입 (예: "pong")
  [key: string]: any; // 추가 필드
};
```

### 클라이언트 메시지 (ClientMessage)

```typescript
type ClientMessage =
  | { action: "subscribe"; topic: string }
  | { action: "unsubscribe"; topic: string }
  | { action: "ping" }
  | Record<string, any>;
```

## 주의사항

1. WebSocket 서버 URL이 유효한지 확인
2. 컴포넌트 언마운트 시 구독 해제 필수
3. 재연결 시 이전 구독 정보 자동 복구
4. 하트비트 응답 시간 초과 시 자동 재연결

## 📘 상세 Hook 문서

useWebSocket Hook의 내부 동작, 옵션 설명, 사용 예제 등 자세한 내용은 [hook-README.md](./src/hooks/hook-README.md) 파일을 참고하세요.
