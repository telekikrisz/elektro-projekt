import { and, asc, eq } from "drizzle-orm";
import { db } from "./db/index.js";
import { alkatresz, tarolo } from "./db/schema.js";

export type Rekesz = { id: number; oldal: string; sor: number; oszlop: number };

function szam(ertek: unknown) {
  const szamErtek = typeof ertek === "number" ? ertek : Number(ertek);
  if (!Number.isInteger(szamErtek) || szamErtek < 0) return null;
  return szamErtek;
}

export function rekeszBemenet(nyers: unknown) {
  const adat = nyers && typeof nyers === "object" ? (nyers as Record<string, unknown>) : {};
  const oldal = typeof adat.oldal === "string" ? adat.oldal.trim() : "";
  const sor = szam(adat.sor);
  const oszlop = szam(adat.oszlop);
  if (!oldal || sor == null || oszlop == null) {
    throw new Error("Az oldal, a sor és az oszlop kötelező. A sor és az oszlop egész szám legyen.");
  }
  return { oldal, sor, oszlop };
}

export async function rekeszekListaja(alkatreszId: number): Promise<Rekesz[]> {
  return db
    .select({ id: tarolo.id, oldal: tarolo.oldal, sor: tarolo.sor, oszlop: tarolo.oszlop })
    .from(tarolo)
    .where(eq(tarolo.alkatreszId, alkatreszId))
    .orderBy(asc(tarolo.oldal), asc(tarolo.sor), asc(tarolo.oszlop));
}

export async function rekesztHozzarendel(
  alkatreszId: number,
  oldal: string,
  sor: number,
  oszlop: number,
) {
  const [vanAlkatresz] = await db
    .select({ id: alkatresz.id })
    .from(alkatresz)
    .where(eq(alkatresz.id, alkatreszId));
  if (!vanAlkatresz) throw new Error("Nincs ilyen alkatrész.");

  const [meglevo] = await db
    .select({ id: tarolo.id, alkatreszId: tarolo.alkatreszId })
    .from(tarolo)
    .where(and(eq(tarolo.oldal, oldal), eq(tarolo.sor, sor), eq(tarolo.oszlop, oszlop)));

  if (meglevo?.alkatreszId != null && meglevo.alkatreszId !== alkatreszId) {
    throw new Error("Ez a rekesz már másik alkatrészhez tartozik.");
  }
  if (meglevo) {
    await db.update(tarolo).set({ alkatreszId }).where(eq(tarolo.id, meglevo.id));
    return;
  }
  await db.insert(tarolo).values({ oldal, sor, oszlop, alkatreszId });
}

export async function rekesztLevesz(alkatreszId: number, rekeszId: number) {
  const [sor] = await db
    .update(tarolo)
    .set({ alkatreszId: null })
    .where(and(eq(tarolo.id, rekeszId), eq(tarolo.alkatreszId, alkatreszId)))
    .returning({ id: tarolo.id });
  if (!sor) throw new Error("Ez a rekesz nincs ehhez az alkatrészhez rendelve.");
}
