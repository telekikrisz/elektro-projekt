import { eq, sql } from "drizzle-orm";
import {
  alkatresz,
  alkatreszTulajdonsag,
  tarolo,
  technologia,
  tipus,
  tokozas,
  tulajdonsag,
} from "./db/schema.js";
import { closeDb, db } from "./db/index.js";

const MINTA_OLDAL = "M";
const MINTA_CIKKSZAM = "MINTA-%";

const KEPEK = [
  "https://www.hestore.hu/images/comp/dG9fcG1jOW9rYTJhbQ.jpg",
  "https://www.hestore.hu/images/comp/bGVkXzVtbV9yZWQZWQ.jpg",
  "https://www.hestore.hu/images/comp/MncMnc.jpg",
];

const ADATLAPOK = [
  "https://www.hestore.hu/prod_getfile.php?id=12935",
  "https://www.hestore.hu/prod_getfile.php?id=6540",
  "https://www.hestore.hu/prod_getfile.php?id=4082",
];

type Minta = {
  megnevezes: string;
  tipus: string;
  technologia: string;
  tokozas: string;
  tulajdonsagok: [string, string][];
  helyek: [number, number][];
};

const mintak: Minta[] = [
  {
    megnevezes: "1k ellenállás",
    tipus: "0,25W",
    technologia: "THT",
    tokozas: "RM10",
    tulajdonsagok: [
      ["Névleges érték", "1 kΩ"],
      ["Teljesítmény", "0,25W"],
      ["Tűrés", "1%"],
    ],
    helyek: [
      [1, 1],
      [1, 2],
    ],
  },
  {
    megnevezes: "10k ellenállás",
    tipus: "0,25W",
    technologia: "THT",
    tokozas: "RM10",
    tulajdonsagok: [
      ["Névleges érték", "10 kΩ"],
      ["Teljesítmény", "0,25W"],
      ["Tűrés", "5%"],
    ],
    helyek: [[1, 3]],
  },
  {
    megnevezes: "100 ohmos SMD",
    tipus: "0,1W",
    technologia: "SMD",
    tokozas: "0805",
    tulajdonsagok: [
      ["Névleges érték", "100 Ω"],
      ["Teljesítmény", "0,1W"],
      ["Tűrés", "1%"],
    ],
    helyek: [[2, 1]],
  },
  {
    megnevezes: "100nF kerámia",
    tipus: "kerámia",
    technologia: "THT",
    tokozas: "RM5",
    tulajdonsagok: [
      ["Kapacitás", "100 nF"],
      ["Feszültség", "50V"],
      ["Tűrés", "10%"],
    ],
    helyek: [[2, 2]],
  },
  {
    megnevezes: "10µF elkó",
    tipus: "elektrolit",
    technologia: "THT",
    tokozas: "RM5",
    tulajdonsagok: [
      ["Kapacitás", "10 µF"],
      ["Feszültség", "25V"],
      ["Hőmérséklet", "105°C"],
    ],
    helyek: [
      [2, 3],
      [2, 4],
    ],
  },
  {
    megnevezes: "22pF SMD",
    tipus: "kerámia",
    technologia: "SMD",
    tokozas: "0603",
    tulajdonsagok: [
      ["Kapacitás", "22 pF"],
      ["Feszültség", "50V"],
    ],
    helyek: [[3, 1]],
  },
  {
    megnevezes: "BC557",
    tipus: "PNP",
    technologia: "THT",
    tokozas: "TO-92",
    tulajdonsagok: [
      ["UCE", "45V"],
      ["IC", "100mA"],
      ["Teljesítmény", "500mW"],
    ],
    helyek: [[3, 2]],
  },
  {
    megnevezes: "1N4148",
    tipus: "dióda",
    technologia: "THT",
    tokozas: "DO-35",
    tulajdonsagok: [
      ["Feszültség", "100V"],
      ["Áram", "200mA"],
      ["Kapcsolási idő", "4 ns"],
    ],
    helyek: [[3, 3]],
  },
  {
    megnevezes: "zöld LED",
    tipus: "zöld",
    technologia: "THT",
    tokozas: "5mm",
    tulajdonsagok: [
      ["Feszültség", "2,1V"],
      ["Áram", "20mA"],
      ["Hullámhossz", "525 nm"],
    ],
    helyek: [[4, 1]],
  },
  {
    megnevezes: "kék LED",
    tipus: "kék",
    technologia: "THT",
    tokozas: "5mm",
    tulajdonsagok: [
      ["Feszültség", "3,2V"],
      ["Áram", "20mA"],
      ["Hullámhossz", "470 nm"],
    ],
    helyek: [],
  },
  {
    megnevezes: "NE555",
    tipus: "időzítő",
    technologia: "THT",
    tokozas: "DIP-8",
    tulajdonsagok: [
      ["Feszültség", "4,5–16V"],
      ["Áram", "10mA"],
      ["Frekvencia", "500kHz"],
    ],
    helyek: [
      [4, 2],
      [4, 3],
    ],
  },
  {
    megnevezes: "LM7805",
    tipus: "stabilizátor",
    technologia: "THT",
    tokozas: "TO-220",
    tulajdonsagok: [
      ["Kimenet", "5V"],
      ["Áram", "1A"],
      ["Tokozás hője", "TO-220"],
    ],
    helyek: [[5, 1]],
  },
  {
    megnevezes: "ATmega328P",
    tipus: "mikrokontroller",
    technologia: "THT",
    tokozas: "DIP-28",
    tulajdonsagok: [
      ["Feszültség", "5V"],
      ["Frekvencia", "20MHz"],
      ["Flash", "32 KB"],
      ["RAM", "2 KB"],
    ],
    helyek: [
      [5, 2],
      [5, 3],
    ],
  },
  {
    megnevezes: "5V relé",
    tipus: "relé",
    technologia: "THT",
    tokozas: "RM15",
    tulajdonsagok: [
      ["Tekercs", "5V"],
      ["Érintkező", "10A"],
      ["Kivitel", "váltó"],
    ],
    helyek: [[6, 1]],
  },
  {
    megnevezes: "10k potenciométer",
    tipus: "potenciométer",
    technologia: "THT",
    tokozas: "RM10",
    tulajdonsagok: [
      ["Névleges érték", "10 kΩ"],
      ["Teljesítmény", "0,5W"],
      ["Karakterisztika", "lineáris"],
    ],
    helyek: [],
  },
];

async function szotarId(
  tx: Pick<typeof db, "select" | "insert">,
  tabla: typeof technologia | typeof tipus | typeof tokozas,
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

async function mintaTorlese(tx: Pick<typeof db, "delete">) {
  await tx.delete(tarolo).where(eq(tarolo.oldal, MINTA_OLDAL));
  const toroltek = await tx
    .delete(alkatresz)
    .where(sql`${alkatresz.cikkszam} like ${MINTA_CIKKSZAM}`)
    .returning({ id: alkatresz.id });
  return toroltek.length;
}

async function mintaBetoltese() {
  await db.transaction(async (tx) => {
    const torolve = await mintaTorlese(tx);

    for (const [index, minta] of mintak.entries()) {
      const cikkszam = `MINTA-${String(index + 1).padStart(3, "0")}`;
      const tipusId = await szotarId(tx, tipus, minta.tipus);
      const technologiaId = await szotarId(tx, technologia, minta.technologia);
      const tokozasId = await szotarId(tx, tokozas, minta.tokozas);
      const [sor] = await tx
        .insert(alkatresz)
        .values({
          megnevezes: minta.megnevezes,
          cikkszam,
          tipusId,
          technologiaId,
          tokozasId,
          kepUrl: KEPEK[index % KEPEK.length],
          adatlapUrl: ADATLAPOK[index % ADATLAPOK.length],
          megjegyzes: "minta",
        })
        .returning({ id: alkatresz.id });

      for (const [megnevezes, ertek] of minta.tulajdonsagok) {
        await tx.insert(alkatreszTulajdonsag).values({
          alkatreszId: sor.id,
          tulajdonsagId: await tulajdonsagId(tx, megnevezes),
          ertek,
        });
      }

      for (const [rekeszSor, oszlop] of minta.helyek) {
        await tx.insert(tarolo).values({
          oldal: MINTA_OLDAL,
          sor: rekeszSor,
          oszlop,
          alkatreszId: sor.id,
        });
      }
    }

    console.log(`${mintak.length} mintaalkatrész betöltve, előtte ${torolve} régi minta törölve.`);
  });
}

try {
  if (process.argv.includes("--torol")) {
    const dbSzam = await db.transaction((tx) => mintaTorlese(tx));
    console.log(`${dbSzam} mintaalkatrész és az M jelű rekeszek törölve.`);
  } else {
    await mintaBetoltese();
  }
} finally {
  await closeDb();
}
