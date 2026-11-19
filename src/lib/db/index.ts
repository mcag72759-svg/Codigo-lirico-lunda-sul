import "server-only";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured on the server.");
}

const globalForDb = globalThis as unknown as {
  sqlClient?: ReturnType<typeof postgres>;
};

const sqlClient =
  globalForDb.sqlClient ??
  postgres(connectionString, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.sqlClient = sqlClient;
}

export const db = drizzle(sqlClient, { schema });
