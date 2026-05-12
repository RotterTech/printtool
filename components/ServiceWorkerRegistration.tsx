"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          // Force check for updates immediately
          reg.update();

          // When a new SW is found and ready, reload to activate it
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "activated" &&
                  navigator.serviceWorker.controller
                ) {
                  // New SW activated — reload to use fresh assets
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch(() => {});
    }
  }, []);
  return null;
}
