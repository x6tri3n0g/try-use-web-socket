import { useEffect } from "react";
import { useWebSocketContext } from "../contexts/useWebSocketContext";

export default function Test1() {
  const { subscribe, unsubscribe, select } = useWebSocketContext();

  const test1 = select<Record<string, number>>("test1");

  useEffect(() => {
    subscribe("test1");
    return () => {
      unsubscribe("test1");
    };
  }, [subscribe, unsubscribe]);

  return (
    <section>
      <h2>test1</h2>
      {test1 ? <pre>{JSON.stringify(test1 ?? {}, null, 2)}</pre> : null}
    </section>
  );
}
