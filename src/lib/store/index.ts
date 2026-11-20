import { MemoryStore } from "./memory";
import { PostgresStore } from "./postgres";
import type { Store } from "./types";

const g = globalThis as unknown as { __cynbitStore?: Store };

/** Postgres when DATABASE_URL (or POSTGRES_URL from the Vercel/Neon integration) is set, otherwise a seeded in-memory store. */
export function getStore(): Store {
  if (!g.__cynbitStore) {
    const url = (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.trim();
    g.__cynbitStore = url ? new PostgresStore(url) : new MemoryStore(true);
  }
  return g.__cynbitStore;
}

export type { Store };
