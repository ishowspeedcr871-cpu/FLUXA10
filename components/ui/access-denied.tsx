import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export function AccessDeniedPage({
  title = "403 Access Denied",
  message = "You do not have permission to access this portal or resource.",
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="min-h-screen bg-[#050508] text-white flex flex-col items-center justify-center p-6 text-center select-none relative overflow-x-hidden font-sans">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-red-500/10 blur-[120px] pointer-events-none" />
      
      <div className="max-w-md w-full bg-[#0c0c11]/95 border border-white/10 rounded-[32px] p-8 shadow-2xl relative z-10 flex flex-col items-center">
        <div className="size-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
          <ShieldAlert className="size-8" />
        </div>

        <h1 className="text-2xl font-black text-white tracking-tight mb-2">{title}</h1>
        <p className="text-xs text-muted-foreground mb-8 leading-relaxed">{message}</p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          <Link
            href="/dashboard"
            className="w-full h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="size-3.5" />
            <span>Return to My Portal</span>
          </Link>
          <Link
            href="/login"
            className="w-full h-11 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 hover:bg-accent-cyan/20 text-accent-cyan text-xs font-bold transition-all flex items-center justify-center"
          >
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
