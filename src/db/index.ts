import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("Hiányzik a DATABASE_URL");
}

const client = postgres(url);

export const db = drizzle(client, { schema });

export function closeDb() {
  return client.end();
}
