import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// --- Termux/Android Compatibility Layer ---
// Termux returns 'android' as the platform. Prisma doesn't ship precompiled C++ 
// query engines for Android's Bionic libc. To bypass this, we detect Termux 
// and use Prisma's WebAssembly (WASM) query engine via the `pg` driver adapter.
const isTermux = 
  (typeof process !== 'undefined' && process.env.PREFIX?.includes('com.termux')) || 
  (typeof process !== 'undefined' && !!process.env.TERMUX_VERSION) || 
  (typeof process !== 'undefined' && process.platform === 'android');

let prisma: any;

try {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing');
  }
  let clientOptions: any = {
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  };

  if (isTermux) {
    console.warn('📱 [Termux] Android environment detected.');
    console.warn('📱 [Termux] Bypassing missing native binaries by using Prisma WASM engine with pg adapter.');
    
    // We strictly only initialize the pg pool if we are running on Termux
    // Production behavior remains completely unchanged.
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      const pool = new Pool({ connectionString });
      const adapter = new PrismaPg(pool);
      clientOptions.adapter = adapter;
    } else {
      console.warn('📱 [Termux] DATABASE_URL is missing.');
    }
  }

  prisma = new PrismaClient(clientOptions);
} catch (err: any) {
  console.warn('[AI Studio] Database not connected — using mock. Error:', err.message);
  const noOp = { 
    findMany: async () => [], 
    findFirst: async () => null,
    findUnique: async () => null, 
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {}, 
    delete: async () => ({}), 
    count: async () => 0, 
    aggregate: async () => ({ _sum: { estimatedCost: null } })
  };
  
  prisma = new Proxy({
    $transaction: async (queries: any) => {
      if (Array.isArray(queries)) {
        return Promise.all(queries);
      }
      if (typeof queries === 'function') {
        return queries(prisma);
      }
      return [];
    }
  }, { 
    get: (target: any, prop: string | symbol) => {
      if (typeof prop === 'symbol') return undefined;
      if (prop in target) return target[prop as string];
      if (prop === 'then') return undefined;
      return noOp;
    } 
  });
}

export { prisma };
