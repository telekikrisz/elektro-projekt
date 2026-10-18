import { eq, sql } from "drizzle-orm";
import ExcelJS from "exceljs";
import type { Cell, CellValue } from "exceljs";
import { pathToFileURL } from "node:url";
import {
  alkatresz,
  alkatreszTulajdonsag,
  technologia,
  tipus,
  tokozas,
  tulajdonsag,
} from "./db/schema.js";
import { closeDb, db } from "./db/index.js";

const ROGZITETT = new Set([
  "megnevezés",
  "cikkszám",
  "típus",
  "technológia",
  "tokozás",
  "kép",
  "adatlap",
  "megjegyzés",
  "kért db",
]);

type Szotar = typeof technologia | typeof tipus | typeof tokozas;

function cellaSzoveg(ertek: CellValue): string {
  if (ertek == null) return "";
  if (typeof ertek === "string" || typeof ertek === "number" || typeof ertek === "boolean") {
    return String(ertek).trim();
  }
  if (ertek instanceof Date) return ertek.toISOString();
  if (typeof ertek === "object") {
    if ("richText" in ertek && Array.isArray(ertek.richText)) {
      return ertek.richText.map((resz) => resz.text).join("").trim();
    }
    if ("text" in ertek && typeof ertek.text === "string") return ertek.text.trim();
    if ("result" in ertek) return cellaSzoveg(ertek.result as CellValue);
  }
  return "";
}

function cellaUrl(cella: Cell): string {
  const kozvetlen = cella.hyperlink?.trim();
  if (kozvetlen) return kozvetlen;
  const ertek = cella.value;
  if (ertek && typeof ertek === "object" && "hyperlink" in ertek && typeof ertek.hyperlink === "string") {
    return ertek.hyperlink.trim();
  }
  return cellaSzoveg(ertek);
}

function kotelezo(sor: number, nev: string, ertek: string) {
  if (!ertek) {
    throw new Error(`A ${sor}. sorban hiányzik: ${nev}`);
  }
  return ertek;
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

export async function excelBetolt(forras: string | Buffer) {
  const munkafuzet = new ExcelJS.Workbook();
  if (typeof forras === "string") await munkafuzet.xlsx.readFile(forras);
  else await munkafuzet.xlsx.load(forras as unknown as Parameters<typeof munkafuzet.xlsx.load>[0]);
  const lap = munkafuzet.worksheets[0];
  if (!lap) throw new Error("Az Excelnek nincs munkalapja.");

  const fejlecek = new Map<number, string>();
  lap.getRow(1).eachCell({ includeEmpty: false }, (cella, oszlop) => {
    const nev = cellaSzoveg(cella.value).toLowerCase();
    if (nev) fejlecek.set(oszlop, nev);
  });

  function oszlop(nev: string) {
    for (const [index, fejlec] of fejlecek) {
      if (fejlec === nev) return index;
    }
    return undefined;
  }

  for (const nev of ["megnevezés", "cikkszám", "típus", "technológia", "tokozás", "kép", "adatlap"]) {
    if (!oszlop(nev)) throw new Error(`Hiányzó oszlop: ${nev}`);
  }

  const tulajdonsagOszlopok = [...fejlecek.entries()].filter(
    ([, nev]) => !ROGZITETT.has(nev),
  );

  const eredmeny = await db.transaction(async (tx) => {
    const cikkszamok = new Set<string>();
    let db = 0;

    for (let sorSzam = 2; sorSzam <= lap.rowCount; sorSzam++) {
      const sor = lap.getRow(sorSzam);
      const szoveg = (nev: string) => cellaSzoveg(sor.getCell(oszlop(nev)!).value);
      const cikkszam = szoveg("cikkszám");
      if (!cikkszam) continue;

      const kulcs = cikkszam.toLowerCase();
      if (cikkszamok.has(kulcs)) {
        throw new Error(`A cikkszám kétszer szerepel: ${cikkszam}`);
      }
      cikkszamok.add(kulcs);

      const megnevezes = kotelezo(sorSzam, "megnevezés", szoveg("megnevezés"));
      const tipusNev = kotelezo(sorSzam, "típus", szoveg("típus"));
      const technologiaNev = kotelezo(sorSzam, "technológia", szoveg("technológia"));
      const tokozasNev = kotelezo(sorSzam, "tokozás", szoveg("tokozás"));
      const kepUrl = kotelezo(sorSzam, "kép", cellaUrl(sor.getCell(oszlop("kép")!)));
      const adatlapUrl = kotelezo(sorSzam, "adatlap", cellaUrl(sor.getCell(oszlop("adatlap")!)));
      const megjegyzesOszlop = oszlop("megjegyzés");
      const megjegyzes = megjegyzesOszlop
        ? cellaSzoveg(sor.getCell(megjegyzesOszlop).value) || null
        : null;

      const tipusId = await szotarId(tx, tipus, tipusNev);
      const technologiaId = await szotarId(tx, technologia, technologiaNev);
      const tokozasId = await szotarId(tx, tokozas, tokozasNev);

      const adatok = {
        megnevezes,
        cikkszam,
        tipusId,
        technologiaId,
        tokozasId,
        kepUrl,
        adatlapUrl,
        megjegyzes,
      };

      const [meglevo] = await tx
        .select({ id: alkatresz.id })
        .from(alkatresz)
        .where(sql`lower(${alkatresz.cikkszam}) = lower(${cikkszam})`);

      const alkatreszId = meglevo
        ? meglevo.id
        : (
            await tx.insert(alkatresz).values(adatok).returning({ id: alkatresz.id })
          )[0].id;

      if (meglevo) {
        await tx.update(alkatresz).set(adatok).where(eq(alkatresz.id, alkatreszId));
        await tx
          .delete(alkatreszTulajdonsag)
          .where(eq(alkatreszTulajdonsag.alkatreszId, alkatreszId));
      }

      for (const [index, fejlecEredeti] of tulajdonsagOszlopok) {
        const ertek = cellaSzoveg(sor.getCell(index).value);
        if (!ertek) continue;
        const fejlec = lap.getRow(1).getCell(index);
        const megnevezesTul = cellaSzoveg(fejlec.value);
        const tulajdonsagKulcs = await tulajdonsagId(tx, megnevezesTul);
        await tx.insert(alkatreszTulajdonsag).values({
          alkatreszId,
          tulajdonsagId: tulajdonsagKulcs,
          ertek,
        });
      }

      db++;
    }

    return db;
  });

  return eredmeny;
}

const sajat = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === sajat) {
  const fajl = process.argv[2] ?? "minta (1).xlsx";
  try {
    const eredmeny = await excelBetolt(fajl);
    console.log(`${eredmeny} alkatrész betöltve: ${fajl}`);
  } finally {
    await closeDb();
  }
}
