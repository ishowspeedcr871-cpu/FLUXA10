"use client";

import { useEffect, useState } from "react";

interface RouteLoadingStateProps {
  label?: string;
}

export function RouteLoadingState({ label = "Preparing FLUXA workspace" }: RouteLoadingStateProps) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setVisible(true), 180);
    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current < 55) return current + 7;
        if (current < 82) return current + 3;
        if (current < 94) return current + 1;
        return current;
      });
    }, 240);

    return () => {
      window.clearTimeout(showTimer);
      window.clearInterval(progressTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-hidden bg-[#030308] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,240,255,0.16),transparent_34%),radial-gradient(circle_at_80%_30%,rgba(168,85,247,0.18),transparent_32%),linear-gradient(135deg,#050508_0%,#090913_55%,#040408_100%)]" />
      <div className="absolute size-[420px] rounded-full border border-cyan-400/10 bg-cyan-400/5 blur-3xl" />
      <div className="relative w-[min(88vw,420px)] rounded-[32px] border border-white/10 bg-black/60 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-2xl">
        <div className="mx-auto mb-8 flex size-28 items-center justify-center rounded-full border border-cyan-300/20 bg-white/[0.03] shadow-[0_0_50px_rgba(0,240,255,0.18)]">
          <div className="relative size-20 rounded-full border-2 border-white/10">
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-cyan-300 border-r-fuchsia-400 shadow-[0_0_24px_rgba(0,240,255,0.5)]" />
            <div className="absolute inset-3 rounded-full bg-gradient-to-br from-cyan-300/20 to-fuchsia-500/20 blur-sm" />
            <div className="absolute inset-0 flex items-center justify-center text-lg font-black tracking-[0.2em] text-cyan-200">F</div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.36em] text-cyan-200">FLUXA</p>
          <h2 className="mt-2 text-xl font-black tracking-tight">{label}</h2>
          <p className="mt-2 text-xs text-slate-400">Resolving session, permissions, workspace and live print data.</p>
        </div>

        <div className="mt-8">
          <div className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
            <span>Loading</span>
            <span className="text-cyan-200">{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-400 shadow-[0_0_20px_rgba(0,240,255,0.55)] transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
