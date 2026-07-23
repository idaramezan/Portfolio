import { useEffect, useState } from "react";

export function useServerNow() {
  const [offset, setOffset] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    let active = true;
    const synchronize = () =>
      fetch("/api/time", { cache: "no-store" })
        .then((response) => response.json())
        .then((data) => {
          const server = Date.parse(data.now);
          if (active && Number.isFinite(server)) {
            setOffset(server - Date.now());
            setNow(Date.now());
          }
        })
        .catch(() => setNow(Date.now()));
    void synchronize();
    const tick = () => {
      if (document.visibilityState === "visible") setNow(Date.now());
    };
    const resume = () => {
      if (document.visibilityState === "visible") void synchronize();
    };
    const timer = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", resume);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);
  return now + offset;
}
