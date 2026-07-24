"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

interface RoutePrefetcherProps {
  routes: readonly string[];
}

function onIdle(callback: () => void) {
  if (typeof globalThis.window === "undefined") return undefined;

  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (idleWindow.requestIdleCallback && idleWindow.cancelIdleCallback) {
    const id = idleWindow.requestIdleCallback(callback, { timeout: 1500 });
    return () => idleWindow.cancelIdleCallback?.(id);
  }

  const id = globalThis.setTimeout(callback, 250);
  return () => globalThis.clearTimeout(id);
}

export function RoutePrefetcher({ routes }: RoutePrefetcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const uniqueRoutes = Array.from(new Set(routes)).filter((route) => route !== pathname);

    return onIdle(() => {
      for (const route of uniqueRoutes) {
        router.prefetch(route);
      }
    });
  }, [pathname, router, routes]);

  return null;
}
