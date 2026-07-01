import { type NeonQueryFunction, neon } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/**
 * Lazily-instantiated Neon SQL tag. Reading DATABASE_URL is deferred until the
 * first query so that importing the tracking domain never fails at build time.
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (client) {
    return client;
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  client = neon(url);
  return client;
}
