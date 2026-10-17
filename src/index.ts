import { serve } from "@hono/node-server";
import { sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./db/index.js";
import { adatlap, keres } from "./kereses.js";

const app = new Hono();

app.use("/api/*", cors());

app.get("/", (c) => c.json({ nev: "Elektro leltár", ok: true }));

app.get("/health", async (c) => {
  await db.execute(sql`select 1`);
  return c.json({ ok: true, db: "postgresql" });
});

app.get("/api/kereses", async (c) => {
  const talalatok = await keres({
    megnevezes: c.req.query("megnevezes"),
    cikkszam: c.req.query("cikkszam"),
    tipus: c.req.query("tipus"),
    technologia: c.req.query("technologia"),
    tokozas: c.req.query("tokozas"),
  });
  return c.json(talalatok);
});

app.get("/api/alkatresz/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) {
    return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  }
  const sor = await adatlap(id);
  if (!sor) return c.json({ hiba: "Nincs ilyen alkatrész." }, 404);
  return c.json(sor);
});

const port = Number(process.env.PORT ?? 3000);

await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent`);

serve({ fetch: app.fetch, port }, () => {
  console.log(`API a ${port} porton`);
});
