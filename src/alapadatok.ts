import { asc, eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { alkatresz, technologia, tipus, tokozas, tulajdonsag } from "./db/schema.js";

export const alapFajtak = ["tipus", "technologia", "tokozas", "tulajdonsag"] as const;
export type AlapFajta = (typeof alapFajtak)[number];

const tablak = { tipus, technologia, tokozas, tulajdonsag };

export function alapFajta(ertek: string): AlapFajta | null {
  return alapFajtak.includes(ertek as AlapFajta) ? (ertek as AlapFajta) : null;
}

type Erintett = { megnevezes: string; cikkszam: string; helyek: string[] };

function helyek(ertek: unknown): string[] {
  if (Array.isArray(ertek)) return ertek.map(String);
  if (typeof ertek === "string") return JSON.parse(ertek) as string[];
  return [];
}

export async function alapadatokListaja() {
  const [tipusok, technologiak, tokozasok, tulajdonsagok] = await Promise.all([
    db.select({ id: tipus.id, nev: tipus.nev }).from(tipus).orderBy(asc(tipus.nev)),
    db.select({ id: technologia.id, nev: technologia.nev }).from(technologia).orderBy(asc(technologia.nev)),
    db.select({ id: tokozas.id, nev: tokozas.nev }).from(tokozas).orderBy(asc(tokozas.nev)),
    db.select({ id: tulajdonsag.id, nev: tulajdonsag.megnevezes }).from(tulajdonsag).orderBy(asc(tulajdonsag.megnevezes)),
  ]);
  return { tipus: tipusok, technologia: technologiak, tokozas: tokozasok, tulajdonsag: tulajdonsagok };
}

async function alapadatNeve(fajta: AlapFajta, id: number) {
  if (fajta === "tulajdonsag") {
    const [sor] = await db
      .select({ nev: tulajdonsag.megnevezes })
      .from(tulajdonsag)
      .where(eq(tulajdonsag.id, id));
    return sor?.nev;
  }
  const tabla = tablak[fajta];
  const [sor] = await db.select({ nev: tabla.nev }).from(tabla).where(eq(tabla.id, id));
  return sor?.nev;
}

export async function alapadatHatasa(fajta: AlapFajta, id: number) {
  const nev = await alapadatNeve(fajta, id);
  if (!nev) return undefined;

  const szuro =
    fajta === "tulajdonsag"
      ? sql`JOIN alkatresz_tulajdonsag kapocs ON kapocs.alkatresz_id = a.id WHERE kapocs.tulajdonsag_id = ${id}`
      : sql`WHERE ${
          fajta === "tipus" ? sql`a.tipus_id` : fajta === "technologia" ? sql`a.technologia_id` : sql`a.tokozas_id`
        } = ${id}`;

  const sorok = await db.execute(sql`
    SELECT
      a.megnevezes,
      a.cikkszam,
      COALESCE(
        json_agg(t.oldal || '-' || t.sor::text || '-' || t.oszlop::text ORDER BY t.oldal, t.sor, t.oszlop)
          FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS helyek
    FROM alkatresz a
    LEFT JOIN tarolo t ON t.alkatresz_id = a.id
    ${szuro}
    GROUP BY a.id, a.megnevezes, a.cikkszam
    ORDER BY a.megnevezes, a.cikkszam
  `);

  return {
    nev,
    alkatreszek: [...sorok].map((talalat) => ({
      megnevezes: String(talalat.megnevezes),
      cikkszam: String(talalat.cikkszam),
      helyek: helyek(talalat.helyek),
    })) satisfies Erintett[],
  };
}

export async function alapadatotAtnevez(fajta: AlapFajta, id: number, nev: string) {
  const tiszta = nev.trim();
  if (!tiszta) throw new Error("A név kötelező.");
  if (fajta === "tulajdonsag") {
    const [foglalt] = await db
      .select({ id: tulajdonsag.id })
      .from(tulajdonsag)
      .where(sql`lower(${tulajdonsag.megnevezes}) = lower(${tiszta})`);
    if (foglalt && foglalt.id !== id) throw new Error("Ez a név már foglalt.");
    const [sor] = await db
      .update(tulajdonsag)
      .set({ megnevezes: tiszta })
      .where(eq(tulajdonsag.id, id))
      .returning({ id: tulajdonsag.id });
    if (!sor) throw new Error("Nincs ilyen adat.");
    return;
  }
  const tabla = tablak[fajta];
  const [foglalt] = await db
    .select({ id: tabla.id })
    .from(tabla)
    .where(sql`lower(${tabla.nev}) = lower(${tiszta})`);
  if (foglalt && foglalt.id !== id) throw new Error("Ez a név már foglalt.");
  const [sor] = await db.update(tabla).set({ nev: tiszta }).where(eq(tabla.id, id)).returning({ id: tabla.id });
  if (!sor) throw new Error("Nincs ilyen adat.");
}

export async function alapadatotTorol(fajta: AlapFajta, id: number) {
  const hatas = await alapadatHatasa(fajta, id);
  if (!hatas) throw new Error("Nincs ilyen adat.");
  const tabla = tablak[fajta];
  await db.transaction(async (tx) => {
    if (fajta === "tulajdonsag") {
      await tx.execute(sql`
        DELETE FROM alkatresz
        WHERE id IN (
          SELECT alkatresz_id FROM alkatresz_tulajdonsag WHERE tulajdonsag_id = ${id}
        )
      `);
    } else if (fajta === "tipus") {
      await tx.delete(alkatresz).where(eq(alkatresz.tipusId, id));
    } else if (fajta === "technologia") {
      await tx.delete(alkatresz).where(eq(alkatresz.technologiaId, id));
    } else {
      await tx.delete(alkatresz).where(eq(alkatresz.tokozasId, id));
    }
    await tx.delete(tabla).where(eq(tabla.id, id));
  });
}
