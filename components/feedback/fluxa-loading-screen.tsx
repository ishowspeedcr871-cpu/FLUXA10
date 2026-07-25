"use client";

import { Cloud, Printer, ShieldCheck, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface FluxaLoadingScreenProps {
  message?: string;
  submessage?: string;
  progress?: number;
  delayMs?: number;
  className?: string;
}

const statusItems = [
  { label: "Secure", icon: ShieldCheck },
  { label: "Fast", icon: Zap },
  { label: "Reliable", icon: Cloud },
  { label: "Connected", icon: Printer },
] as const;

export function FluxaLoadingScreen({
  message = "Loading your workspace…",
  submessage = "Please wait while we prepare everything for you",
  progress,
  delayMs = 180,
  className,
}: FluxaLoadingScreenProps) {
  const [visible, setVisible] = useState(delayMs <= 0);
  const [syntheticProgress, setSyntheticProgress] = useState(18);

  useEffect(() => {
    if (delayMs <= 0) {
      setVisible(true);
      return undefined;
    }

    const timer = window.setTimeout(() => setVisible(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs]);

  useEffect(() => {
    if (typeof progress === "number") return undefined;

    const interval = window.setInterval(() => {
      setSyntheticProgress((current) => {
        if (current < 62) return current + 6;
        if (current < 82) return current + 2;
        if (current < 94) return current + 0.6;
        return current;
      });
    }, 420);

    return () => window.clearInterval(interval);
  }, [progress]);

  if (!visible) return null;

  const displayProgress = Math.min(99, Math.max(0, progress ?? syntheticProgress));

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#020306] px-6 text-white",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(34,211,238,0.12),transparent_30%),radial-gradient(circle_at_50%_78%,rgba(217,70,239,0.14),transparent_24%)]" />
      <div className="absolute inset-x-[14%] bottom-12 h-20 rounded-[100%] bg-gradient-to-r from-cyan-500/20 via-blue-500/15 to-fuchsia-500/20 blur-3xl" />
      <div className="absolute inset-0 rounded-[2rem] border border-cyan-400/10 shadow-[inset_0_0_80px_rgba(34,211,238,0.05)]" />

      <div className="relative flex w-full max-w-[34rem] flex-col items-center text-center">
        <div className="mb-8 space-y-3">
          <p className="text-5xl font-black tracking-[0.48em] text-transparent bg-gradient-to-r from-cyan-200 via-cyan-400 to-fuchsia-300 bg-clip-text drop-shadow-[0_0_26px_rgba(34,211,238,0.45)] sm:text-6xl">
            FLUXA
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.48em] text-slate-300/85 sm:text-sm">
            Workshop Portal
          </p>
        </div>

        <div className="relative mb-8 flex size-52 items-center justify-center sm:size-60">
          <div className="absolute inset-0 rounded-full border border-cyan-300/10 shadow-[0_0_60px_rgba(34,211,238,0.14)]" />
          <div className="absolute inset-5 animate-spin rounded-full border-[5px] border-cyan-300/95 border-b-fuchsia-500 border-l-cyan-400/80 shadow-[0_0_28px_rgba(34,211,238,0.45)]" />
          <div className="absolute inset-[2.15rem] rounded-full bg-black/60 shadow-[inset_0_0_45px_rgba(2,6,23,0.85)]" />
          <div className="relative text-7xl font-black italic tracking-tighter text-transparent bg-gradient-to-br from-cyan-100 via-cyan-400 to-fuchsia-500 bg-clip-text drop-shadow-[0_0_18px_rgba(34,211,238,0.4)]">
            F
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{message}</h2>
          <p className="text-sm text-slate-400 sm:text-base">{submessage}</p>
        </div>

        <div className="mb-10 flex w-full items-center gap-5">
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-800/80 shadow-[inset_0_0_10px_rgba(0,0,0,0.55)]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 shadow-[0_0_18px_rgba(34,211,238,0.65)] transition-[width] duration-500 ease-out"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
          <span className="w-12 text-left font-mono text-sm font-bold text-cyan-300">
            {Math.round(displayProgress)}%
          </span>
        </div>

        <div className="grid w-full grid-cols-4 divide-x divide-white/10">
          {statusItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex flex-col items-center gap-2 px-2">
                <Icon className="size-7 text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.45)]" />
                <span className="text-xs text-slate-200 sm:text-sm">{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
