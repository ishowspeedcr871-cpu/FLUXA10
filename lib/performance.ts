export function shouldLogPerformance() {
  return process.env.FLUXA_PERF_LOG === "1" || process.env.NEXT_PUBLIC_FLUXA_PERF_LOG === "1";
}

export async function measureAsync<T>(label: string, operation: () => Promise<T>): Promise<T> {
  if (!shouldLogPerformance()) return operation();

  const startedAt = performance.now();
  try {
    return await operation();
  } finally {
    const duration = performance.now() - startedAt;
    console.info(`[perf] ${label} ${duration.toFixed(1)}ms`);
  }
}
