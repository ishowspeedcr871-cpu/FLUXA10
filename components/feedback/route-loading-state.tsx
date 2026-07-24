import { LoadingSpinner } from "@/components/feedback/loading-spinner";

export function RouteLoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black/80 text-slate-100">
      <div className="glass-surface flex items-center gap-3 rounded-2xl px-5 py-4 text-sm text-muted-foreground">
        <LoadingSpinner className="size-4" />
        Loading…
      </div>
    </div>
  );
}
