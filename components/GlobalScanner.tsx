"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

/**
 * GlobalScanner listens to fast barcode scanner keystrokes and routes accordingly.
 * - Prefix "P" (case-insensitive) routes to parts detail: /parts/[code]
 * - Otherwise tries repair lookup, then part lookup as fallback
 * - Ignores input when user is typing inside an input/textarea/contentEditable
 * - Uses a tight timing window (~60ms gap) to capture scanner bursts only
 */
export default function GlobalScanner() {
  const router = useRouter();
  const bufferRef = useRef("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const firstKeyTimeRef = useRef<number | null>(null);
  const lastKeyTimeRef = useRef<number | null>(null);
  const resolvingRef = useRef(false);

  useEffect(() => {
    const clearBuffer = () => {
      bufferRef.current = "";
      firstKeyTimeRef.current = null;
      lastKeyTimeRef.current = null;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const resolveAndRoute = async (raw: string) => {
      const code = raw.trim().replace(/\s+/g, "").toUpperCase();
      if (!code) return;

      if (code.startsWith("P") && code.length > 1) {
        router.push(`/parts/${code}`);
        toast.success(`Onderdeel ${code} geladen`);
        return;
      }

      try {
        const repairRes = await fetch(`/api/repairs/one?jobid=${encodeURIComponent(code)}&skipPrint=1`);
        if (repairRes.ok) {
          router.push(`/repairs/${code}`);
          toast.success(`Reparatie ${code} geladen`);
          return;
        }
      } catch {}

      try {
        const partRes = await fetch(`/api/parts/one?code=${encodeURIComponent(code)}`);
        if (partRes.ok) {
          const payload = await partRes.json();
          const partId = payload?.data?.short_id || payload?.data?.id || code;
          router.push(`/parts/${partId}`);
          toast.success(`Onderdeel ${partId} geladen`);
          return;
        }
      } catch {}

      router.push(`/repairs/${code}`);
      toast(`Geen match gevonden voor ${code}`);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in inputs/textareas or contentEditable
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable)
      ) {
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const now = Date.now();

      // Reset buffer if too slow between keys (>150ms)
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        const first = firstKeyTimeRef.current ?? now;
        const last = lastKeyTimeRef.current ?? now;
        const duration = last - first;
        const code = bufferRef.current.trim();

        // Auto-resolve if scan completed without Enter
        if (code.length >= 4 && duration <= 700) {
          if (!resolvingRef.current) {
            resolvingRef.current = true;
            resolveAndRoute(code).finally(() => {
              resolvingRef.current = false;
            });
          }
        }

        clearBuffer();
      }, 150);

      // If Enter is pressed, evaluate buffer
      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        clearBuffer();
        if (!code) return;

        if (resolvingRef.current) return;
        resolvingRef.current = true;
        resolveAndRoute(code).finally(() => {
          resolvingRef.current = false;
        });
        return;
      }

      // Only allow reasonable printable characters
      if (e.key.length === 1) {
        if (!firstKeyTimeRef.current) {
          firstKeyTimeRef.current = now;
        }
        lastKeyTimeRef.current = now;
        bufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearBuffer();
    };
  }, [router]);

  return null;
}
