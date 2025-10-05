import { useEffect } from "react";
import { useWebSocketContext } from "../contexts/useWebSocketContext";

export default function Test2() {
  const { subscribe, unsubscribe, select } = useWebSocketContext();

  const test2 = select<Record<string, number>>("test2");

  useEffect(() => {
    subscribe("test2");

    return () => {
      unsubscribe("test2");
    };
  }, [subscribe, unsubscribe]);

  return (
    <section>
      <h2>test2</h2>
      {test2 ? <pre>{JSON.stringify(test2 ?? {}, null, 2)}</pre> : null}
    </section>
  );
}
