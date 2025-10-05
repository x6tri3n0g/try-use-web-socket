import "./App.css";

import Test1 from "./components/Test1";
import Test2 from "./components/Test2";
import { useWebSocketContext } from "./contexts/useWebSocketContext";

export default function App() {
  const { status } = useWebSocketContext();

  return (
    <main style={{ padding: 16 }}>
      <h1>Live Dashboard</h1>
      <p>
        WS status: <b>{status}</b>
      </p>
      <Test1 />
      <Test2 />
    </main>
  );
}
