import { useEffect } from "react";
import { useLocation } from "@tanstack/react-router";
import { env } from "@env/client";

type TrackPayload = {
  path: string;
  referrer?: string;
  activityType: "pageview" | "heartbeat" | "activity";
};

// const TRACK_INTERVAL_MS = 30_000;

function shouldTrackPath(pathname: string) {
  if (pathname.startsWith("/admin")) {
    return false;
  }

  return true;
}

async function sendTrack(payload: TrackPayload) {
  try {
    await fetch(`${env.VITE_SERVER_URL}/analytics/visitors/track`, {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Best-effort analytics. Ignore network errors.
  }
}

export function VisitorTracker() {
  const location = useLocation();
  // const heartbeatRef = useRef<number | null>(null);

  useEffect(() => {
    const pathname = location.pathname;
    if (!shouldTrackPath(pathname)) {
      return;
    }

    void sendTrack({
      path: `${pathname}${location.searchStr ?? ""}`,
      referrer: document.referrer || undefined,
      activityType: "pageview",
    });
  }, [location.pathname, location.searchStr]);

  // Heartbeat disabled for now — re-enable when periodic presence tracking is needed.
  // useEffect(() => {
  //   const tick = () => {
  //     const pathname = window.location.pathname;
  //     if (!shouldTrackPath(pathname) || document.hidden) {
  //       return;
  //     }
  //
  //     void sendTrack({
  //       path: `${window.location.pathname}${window.location.search}`,
  //       activityType: "heartbeat",
  //     });
  //   };
  //
  //   const interval = window.setInterval(tick, TRACK_INTERVAL_MS);
  //   heartbeatRef.current = interval;
  //
  //   const onVisibilityChange = () => {
  //     if (!document.hidden) {
  //       tick();
  //     }
  //   };
  //
  //   document.addEventListener("visibilitychange", onVisibilityChange);
  //
  //   return () => {
  //     if (heartbeatRef.current) {
  //       window.clearInterval(heartbeatRef.current);
  //     }
  //     document.removeEventListener("visibilitychange", onVisibilityChange);
  //   };
  // }, []);

  return null;
}
