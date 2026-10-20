import { serve } from "@hono/node-server";
import type { Context } from "hono";
import { count, sql } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { aktualisTanar, beleptet, elsoTanar, kijelentkeztet, szemely, sutiBeallit, type Belepett } from "./auth.js";
import {
  felhasznalokListaja,
  felhasznalotLetrehoz,
  felhasznalotModosit,
  felhasznalotTorol,
  jelszotCserel,
  sajatotModosit,
} from "./felhasznalok.js";
import { db } from "./db/index.js";
import { alkatresz } from "./db/schema.js";
import { excelBetolt } from "./import-xlsx.js";
import {
  alkatreszBemenet,
  alkatresztBetolt,
  alkatresztLetrehoz,
  alkatresztModosit,
  alkatresztTorol,
} from "./alkatreszek.js";
import { alapadatHatasa, alapadatotAtnevez, alapadatotTorol, alapadatokListaja, alapFajta } from "./alapadatok.js";
import { adatlap, keres } from "./kereses.js";
import { rekeszBemenet, rekeszekListaja, rekesztHozzarendel, rekesztLevesz } from "./rekeszek.js";

const app = new Hono();

function hibaUzenet(hiba: unknown, alap: string) {
  return hiba instanceof Error ? hiba.message : alap;
}

async function belepett(c: Context) {
  const sor = await aktualisTanar(c);
  if (!sor) return { hiba: c.json({ hiba: "Bejelentkezés szükséges." }, 401) };
  return { sor };
}

function csereKell(c: Context, sor: Belepett) {
  if (!sor.jelszoCsere) return null;
  return c.json({ hiba: "Előbb cseréld le a jelszót." }, 403);
}

function szuperadminKell(c: Context, sor: Belepett) {
  if (!sor.szuperadmin) return c.json({ hiba: "Ehhez szuperadmin kell." }, 403);
  return null;
}

function egesz(ertek: string) {
  const id = Number(ertek);
  return Number.isInteger(id) ? id : null;
}

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

app.post("/api/belepes", async (c) => {
  const adatok = await c.req.json().catch(() => null);
  const email = typeof adatok?.email === "string" ? adatok.email : "";
  const jelszo = typeof adatok?.jelszo === "string" ? adatok.jelszo : "";
  if (!email.trim() || !jelszo) {
    return c.json({ hiba: "Add meg az e-mail címet és a jelszót." }, 400);
  }
  const munkamenet = await beleptet(email, jelszo);
  if (!munkamenet) return c.json({ hiba: "Hibás e-mail cím vagy jelszó." }, 401);
  sutiBeallit(c, munkamenet.token);
  return c.json({
    nev: munkamenet.nev,
    email: munkamenet.email,
    szuperadmin: munkamenet.szuperadmin,
    jelszoCsere: munkamenet.jelszoCsere,
  });
});

app.post("/api/kilepes", async (c) => {
  await kijelentkeztet(c);
  return c.json({ ok: true });
});

app.get("/api/en", async (c) => {
  const tanar = await aktualisTanar(c);
  if (!tanar) return c.json({ hiba: "Bejelentkezés szükséges." }, 401);
  return c.json(szemely(tanar));
});

app.post("/api/jelszo", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const adatok = await c.req.json().catch(() => null);
  const jelszo = typeof adatok?.jelszo === "string" ? adatok.jelszo : "";
  const megerosites = typeof adatok?.megerosites === "string" ? adatok.megerosites : "";
  if (jelszo !== megerosites) return c.json({ hiba: "A két jelszó nem egyezik." }, 400);
  try {
    await jelszotCserel(kapott.sor.id, jelszo);
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A csere nem sikerült.") }, 400);
  }
});

app.get("/api/felhasznalok", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  return c.json(await felhasznalokListaja());
});

app.post("/api/felhasznalok", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const adatok = await c.req.json().catch(() => null);
  try {
    await felhasznalotLetrehoz(
      typeof adatok?.nev === "string" ? adatok.nev : "",
      typeof adatok?.email === "string" ? adatok.email : "",
      typeof adatok?.jelszo === "string" ? adatok.jelszo : "",
    );
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A létrehozás nem sikerült.") }, 400);
  }
});

app.patch("/api/felhasznalok/sajat", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const adatok = await c.req.json().catch(() => null);
  try {
    const friss = await sajatotModosit(
      kapott.sor.id,
      typeof adatok?.nev === "string" ? adatok.nev : "",
      typeof adatok?.email === "string" ? adatok.email : "",
      typeof adatok?.jelszo === "string" ? adatok.jelszo : "",
    );
    return c.json(friss);
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A mentés nem sikerült.") }, 400);
  }
});

app.delete("/api/felhasznalok/sajat", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  await felhasznalotTorol(kapott.sor.id);
  await kijelentkeztet(c);
  return c.json({ ok: true });
});

app.patch("/api/felhasznalok/:id", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  if (!kapott.sor.szuperadmin) return c.json({ hiba: "Ehhez szuperadmin kell." }, 403);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  const adatok = await c.req.json().catch(() => null);
  try {
    await felhasznalotModosit(
      id,
      typeof adatok?.nev === "string" ? adatok.nev : "",
      typeof adatok?.email === "string" ? adatok.email : "",
      typeof adatok?.jelszo === "string" ? adatok.jelszo : "",
    );
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A mentés nem sikerült.") }, 400);
  }
});

app.delete("/api/felhasznalok/:id", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  if (!kapott.sor.szuperadmin) return c.json({ hiba: "Ehhez szuperadmin kell." }, 403);
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  try {
    await felhasznalotTorol(id);
    if (id === kapott.sor.id) await kijelentkeztet(c);
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A törlés nem sikerült.") }, 400);
  }
});

app.get("/api/tanar/osszesites", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const [sor] = await db.select({ db: count() }).from(alkatresz);
  return c.json({ alkatreszek: sor.db });
});

app.post("/api/import", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;

  const adatok = await c.req.parseBody();
  const fajl = adatok.fajl;
  if (!(fajl instanceof File)) return c.json({ hiba: "Válassz egy Excel-fájlt." }, 400);
  if (!fajl.name.toLowerCase().endsWith(".xlsx")) {
    return c.json({ hiba: "Csak .xlsx fájl tölthető fel." }, 400);
  }
  if (fajl.size > 8_000_000) return c.json({ hiba: "A fájl túl nagy." }, 400);

  try {
    const betoltve = await excelBetolt(Buffer.from(await fajl.arrayBuffer()));
    return c.json({ betoltve });
  } catch (hiba) {
    const uzenet = hiba instanceof Error ? hiba.message : "A betöltés nem sikerült.";
    return c.json({ hiba: uzenet }, 400);
  }
});

app.post("/api/alkatreszek", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  try {
    await alkatresztLetrehoz(alkatreszBemenet(await c.req.json().catch(() => null)));
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A felvitel nem sikerült.") }, 400);
  }
});

app.get("/api/alkatreszek/:id", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  const sor = await alkatresztBetolt(id);
  if (!sor) return c.json({ hiba: "Nincs ilyen alkatrész." }, 404);
  return c.json(sor);
});

app.patch("/api/alkatreszek/:id", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  try {
    await alkatresztModosit(id, alkatreszBemenet(await c.req.json().catch(() => null)));
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A mentés nem sikerült.") }, 400);
  }
});

app.delete("/api/alkatreszek/:id", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  try {
    await alkatresztTorol(id);
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A törlés nem sikerült.") }, 400);
  }
});

app.get("/api/alkatreszek/:id/rekeszek", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const id = egesz(c.req.param("id"));
  if (id == null) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  return c.json(await rekeszekListaja(id));
});

app.post("/api/alkatreszek/:id/rekeszek", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const id = egesz(c.req.param("id"));
  if (id == null) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  try {
    const rekesz = rekeszBemenet(await c.req.json().catch(() => null));
    await rekesztHozzarendel(id, rekesz.oldal, rekesz.sor, rekesz.oszlop);
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A hozzárendelés nem sikerült.") }, 400);
  }
});

app.delete("/api/alkatreszek/:id/rekeszek/:rekeszId", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const id = egesz(c.req.param("id"));
  const rekeszId = egesz(c.req.param("rekeszId"));
  if (id == null || rekeszId == null) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  try {
    await rekesztLevesz(id, rekeszId);
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A levétel nem sikerült.") }, 400);
  }
});

app.get("/api/alapadatok", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const jogosultsag = szuperadminKell(c, kapott.sor);
  if (jogosultsag) return jogosultsag;
  return c.json(await alapadatokListaja());
});

app.get("/api/alapadatok/:fajta/:id/hatas", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const jogosultsag = szuperadminKell(c, kapott.sor);
  if (jogosultsag) return jogosultsag;
  const fajta = alapFajta(c.req.param("fajta"));
  const id = egesz(c.req.param("id"));
  if (!fajta || id == null) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  const hatas = await alapadatHatasa(fajta, id);
  if (!hatas) return c.json({ hiba: "Nincs ilyen adat." }, 404);
  return c.json(hatas);
});

app.patch("/api/alapadatok/:fajta/:id", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const jogosultsag = szuperadminKell(c, kapott.sor);
  if (jogosultsag) return jogosultsag;
  const fajta = alapFajta(c.req.param("fajta"));
  const id = egesz(c.req.param("id"));
  if (!fajta || id == null) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  const adatok = await c.req.json().catch(() => null);
  try {
    await alapadatotAtnevez(fajta, id, typeof adatok?.nev === "string" ? adatok.nev : "");
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A mentés nem sikerült.") }, 400);
  }
});

app.delete("/api/alapadatok/:fajta/:id", async (c) => {
  const kapott = await belepett(c);
  if ("hiba" in kapott) return kapott.hiba;
  const tiltas = csereKell(c, kapott.sor);
  if (tiltas) return tiltas;
  const jogosultsag = szuperadminKell(c, kapott.sor);
  if (jogosultsag) return jogosultsag;
  const fajta = alapFajta(c.req.param("fajta"));
  const id = egesz(c.req.param("id"));
  if (!fajta || id == null) return c.json({ hiba: "Érvénytelen azonosító." }, 400);
  try {
    await alapadatotTorol(fajta, id);
    return c.json({ ok: true });
  } catch (hiba) {
    return c.json({ hiba: hibaUzenet(hiba, "A törlés nem sikerült.") }, 400);
  }
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
await elsoTanar();

serve({ fetch: app.fetch, port }, () => {
  console.log(`API a ${port} porton`);
});
