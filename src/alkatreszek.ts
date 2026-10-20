import { eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import {
  alkatresz,
  alkatreszTulajdonsag,
  technologia,
  tipus,
  tokozas,
  tulajdonsag,
} from "./db/schema.js";

type Szotar = typeof technologia | typeof tipus | typeof tokozas;

export type AlkatreszBemenet = {
  megnevezes: string;
  cikkszam: string;
  tipus: string;
  technologia: string;
  tokozas: string;
  kepUrl: string;
  adatlapUrl: string;
  megjegyzes: string;
  tulajdonsagok: { megnevezes: string; ertek: string }[];
};

export type AlkatreszLap = AlkatreszBemenet & { id: number };

function szoveg(ertek: unknown) {
  return typeof ertek === "string" ? ertek.trim() : "";
}

export function alkatreszBemenet(nyers: unknown): AlkatreszBemenet {
  const adat = nyers && typeof nyers === "object" ? (nyers as Record<string, unknown>) : {};
  const tulajdonsagok = Array.isArray(adat.tulajdonsagok) ? adat.tulajdonsagok : [];
  return {
    megnevezes: szoveg(adat.megnevezes),
    cikkszam: szoveg(adat.cikkszam),
    tipus: szoveg(adat.tipus),
    technologia: szoveg(adat.technologia),
    tokozas: szoveg(adat.tokozas),
    kepUrl: szoveg(adat.kepUrl),
    adatlapUrl: szoveg(adat.adatlapUrl),
    megjegyzes: szoveg(adat.megjegyzes),
    tulajdonsagok: tulajdonsagok.map((sor) => {
      const mezo = sor && typeof sor === "object" ? (sor as Record<string, unknown>) : {};
      return { megnevezes: szoveg(mezo.megnevezes), ertek: szoveg(mezo.ertek) };
    }),
  };
}

function kotelezo(adat: AlkatreszBemenet) {
  if (!adat.megnevezes || !adat.cikkszam || !adat.tipus || !adat.technologia || !adat.tokozas) {
    throw new Error("A megnevezés, a cikkszám, a típus, a technológia és a tokozás kötelező.");
  }
  const nevek = new Set<string>();
  for (const sor of adat.tulajdonsagok) {
    if (!sor.megnevezes && !sor.ertek) continue;
    if (!sor.megnevezes || !sor.ertek) throw new Error("A tulajdonságnak név és érték is kell.");
    const kulcs = sor.megnevezes.toLowerCase();
    if (nevek.has(kulcs)) throw new Error(`A tulajdonság kétszer szerepel: ${sor.megnevezes}`);
    nevek.add(kulcs);
  }
}

async function foglalt(cikkszam: string, kiveve?: number) {
  const [sor] = await db
    .select({ id: alkatresz.id })
    .from(alkatresz)
    .where(sql`lower(${alkatresz.cikkszam}) = lower(${cikkszam})`);
  return sor != null && sor.id !== kiveve;
}

async function szotarId(
  tx: Pick<typeof db, "select" | "insert">,
  tabla: Szotar,
  nev: string,
) {
  const [meglevo] = await tx
    .select({ id: tabla.id })
    .from(tabla)
    .where(sql`lower(${tabla.nev}) = lower(${nev})`);
  if (meglevo) return meglevo.id;
  const [uj] = await tx.insert(tabla).values({ nev }).returning({ id: tabla.id });
  return uj.id;
}

async function tulajdonsagId(tx: Pick<typeof db, "select" | "insert">, megnevezes: string) {
  const [meglevo] = await tx
    .select({ id: tulajdonsag.id })
    .from(tulajdonsag)
    .where(sql`lower(${tulajdonsag.megnevezes}) = lower(${megnevezes})`);
  if (meglevo) return meglevo.id;
  const [uj] = await tx
    .insert(tulajdonsag)
    .values({ megnevezes })
    .returning({ id: tulajdonsag.id });
  return uj.id;
}

async function tulajdonsagokatMent(
  tx: Pick<typeof db, "select" | "insert" | "delete">,
  alkatreszId: number,
  sorok: { megnevezes: string; ertek: string }[],
) {
  await tx.delete(alkatreszTulajdonsag).where(eq(alkatreszTulajdonsag.alkatreszId, alkatreszId));
  for (const sor of sorok) {
    if (!sor.megnevezes || !sor.ertek) continue;
    await tx.insert(alkatreszTulajdonsag).values({
      alkatreszId,
      tulajdonsagId: await tulajdonsagId(tx, sor.megnevezes),
      ertek: sor.ertek,
    });
  }
}

export async function alkatresztBetolt(id: number): Promise<AlkatreszLap | undefined> {
  const sorok = await db.execute(sql`
    SELECT
      a.id,
      a.megnevezes,
      a.cikkszam,
      a.kep_url,
      a.adatlap_url,
      a.megjegyzes,
      ti.nev AS tipus,
      te.nev AS technologia,
      tk.nev AS tokozas
    FROM alkatresz a
    JOIN tipus ti ON ti.id = a.tipus_id
    JOIN technologia te ON te.id = a.technologia_id
    JOIN tokozas tk ON tk.id = a.tokozas_id
    WHERE a.id = ${id}
  `);
  const sor = [...sorok][0];
  if (!sor) return undefined;

  const tulajdonsagok = await db.execute(sql`
    SELECT tu.megnevezes, at.ertek
    FROM alkatresz_tulajdonsag at
    JOIN tulajdonsag tu ON tu.id = at.tulajdonsag_id
    WHERE at.alkatresz_id = ${id}
    ORDER BY tu.megnevezes
  `);

  return {
    id: Number(sor.id),
    megnevezes: String(sor.megnevezes),
    cikkszam: String(sor.cikkszam),
    tipus: String(sor.tipus),
    technologia: String(sor.technologia),
    tokozas: String(sor.tokozas),
    kepUrl: String(sor.kep_url ?? ""),
    adatlapUrl: String(sor.adatlap_url ?? ""),
    megjegyzes: sor.megjegyzes == null ? "" : String(sor.megjegyzes),
    tulajdonsagok: [...tulajdonsagok].map((tul) => ({
      megnevezes: String(tul.megnevezes),
      ertek: String(tul.ertek),
    })),
  };
}

export async function alkatresztLetrehoz(adat: AlkatreszBemenet) {
  kotelezo(adat);
  if (await foglalt(adat.cikkszam)) throw new Error("Ez a cikkszám már foglalt.");
  await db.transaction(async (tx) => {
    const [uj] = await tx
      .insert(alkatresz)
      .values({
        megnevezes: adat.megnevezes,
        cikkszam: adat.cikkszam,
        tipusId: await szotarId(tx, tipus, adat.tipus),
        technologiaId: await szotarId(tx, technologia, adat.technologia),
        tokozasId: await szotarId(tx, tokozas, adat.tokozas),
        kepUrl: adat.kepUrl,
        adatlapUrl: adat.adatlapUrl,
        megjegyzes: adat.megjegyzes || null,
      })
      .returning({ id: alkatresz.id });
    await tulajdonsagokatMent(tx, uj.id, adat.tulajdonsagok);
  });
}

export async function alkatresztModosit(id: number, adat: AlkatreszBemenet) {
  const meglevo = await alkatresztBetolt(id);
  if (!meglevo) throw new Error("Nincs ilyen alkatrész.");
  kotelezo(adat);
  if (await foglalt(adat.cikkszam, id)) throw new Error("Ez a cikkszám már foglalt.");
  await db.transaction(async (tx) => {
    await tx
      .update(alkatresz)
      .set({
        megnevezes: adat.megnevezes,
        cikkszam: adat.cikkszam,
        tipusId: await szotarId(tx, tipus, adat.tipus),
        technologiaId: await szotarId(tx, technologia, adat.technologia),
        tokozasId: await szotarId(tx, tokozas, adat.tokozas),
        kepUrl: adat.kepUrl,
        adatlapUrl: adat.adatlapUrl,
        megjegyzes: adat.megjegyzes || null,
      })
      .where(eq(alkatresz.id, id));
    await tulajdonsagokatMent(tx, id, adat.tulajdonsagok);
  });
}

export async function alkatresztTorol(id: number) {
  const [sor] = await db.delete(alkatresz).where(eq(alkatresz.id, id)).returning({ id: alkatresz.id });
  if (!sor) throw new Error("Nincs ilyen alkatrész.");
}
