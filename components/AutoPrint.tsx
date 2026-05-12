"use client";

import { useEffect } from "react";

export default function AutoPrint({ delayMs = 100 }: { delayMs?: number }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [delayMs]);

  return null;
}
