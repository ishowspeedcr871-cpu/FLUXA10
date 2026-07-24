import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// --- Termux/Android Compatibility Layer ---
// Termux returns 'android' as the platform. Prisma doesn't ship precompiled C++
// query engines for Android's Bionic libc. To bypass this, we detect Termux
// and use Prisma's WebAssembly (WASM) query engine via the `pg` driver adapter.
const isTermux =
  (typeof process !== "undefined" && process.env.PREFIX?.includes("com.termux")) ||
  (typeof process !== "undefined" && !!process.env.TERMUX_VERSION) ||
  (typeof process !== "undefined" && process.platform === "android");

type GlobalPrisma = typeof globalThis & {
  __fluxaPrisma?: PrismaClient;
  __fluxaPgPool?: Pool;
};

const globalForPrisma = globalThis as GlobalPrisma;

function createPrismaClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
  }

  const clientOptions: any = {
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  };

  if (isTermux) {
    console.warn("📱 [Termux] Android environment detected; using Prisma pg adapter.");
    globalForPrisma.__fluxaPgPool ??= new Pool({ connectionString: process.env.DATABASE_URL });
    clientOptions.adapter = new PrismaPg(globalForPrisma.__fluxaPgPool);
  }

  return new PrismaClient(clientOptions);
}

let prisma: PrismaClient;

try {
  prisma = globalForPrisma.__fluxaPrisma ?? createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.__fluxaPrisma = prisma;
  }
} catch (err: any) {
  console.warn("[AI Studio] Database not connected — using mock. Error:", err.message);
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    updateMany: async () => ({ count: 0 }),
    delete: async () => ({}),
    count: async () => 0,
    aggregate: async () => ({ _sum: { estimatedCost: null } }),
  };

  prisma = new Proxy(
    {
      $transaction: async (queries: any) => {
        if (Array.isArray(queries)) return Promise.all(queries);
        if (typeof queries === "function") return queries(prisma);
        return [];
      },
    } as PrismaClient,
    {
      get: (target: any, prop: string | symbol) => {
        if (typeof prop === "symbol") return undefined;
        if (prop in target) return target[prop as string];
        if (prop === "then") return undefined;
        return noOp;
      },
    },
  );
}

export { prisma };
