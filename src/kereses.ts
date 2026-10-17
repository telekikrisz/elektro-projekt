import { sql, type SQL } from "drizzle-orm";
import { db } from "./db/index.js";

export type Talalat = {
  id: number;
  megnevezes: string;
  cikkszam: string;
  tipus: string;
  technologia: string;
  tokozas: string;
  helyek: string[];
};

export type Adatlap = Talalat & {
  kepUrl: string;
  adatlapUrl: string;
  tulajdonsagok: { megnevezes: string; ertek: string }[];
};

export type Szurok = {
  megnevezes?: string;
  cikkszam?: string;
  tipus?: string;
  technologia?: string;
  tokozas?: string;
};

function minta(ertek: string | undefined): SQL | undefined {
  const tiszta = ertek?.trim();
  if (!tiszta) return undefined;
  return sql`${`%${tiszta.replace(/[%_\\]/g, "\\$&")}%`}`;
}

function like(oszlop: SQL, ertek: string | undefined): SQL | undefined {
  const keres = minta(ertek);
  if (!keres) return undefined;
  return sql`unaccent(${oszlop}) ILIKE unaccent(${keres}) ESCAPE '\\'`;
}

function helyek(ertek: unknown): string[] {
  if (Array.isArray(ertek)) return ertek.map(String);
  if (typeof ertek === "string") return JSON.parse(ertek) as string[];
  return [];
}

export async function keres(szurok: Szurok): Promise<Talalat[]> {
  const feltetelek = [
    like(sql`a.megnevezes`, szurok.megnevezes),
    like(sql`a.cikkszam`, szurok.cikkszam),
    like(sql`ti.nev`, szurok.tipus),
    like(sql`te.nev`, szurok.technologia),
    like(sql`tk.nev`, szurok.tokozas),
  ].filter((feltetel): feltetel is SQL => feltetel !== undefined);

  const where =
    feltetelek.length > 0
      ? sql`WHERE ${sql.join(feltetelek, sql` AND `)}`
      : sql``;

  const sorok = await db.execute(sql`
    SELECT
      a.id,
      a.megnevezes,
      a.cikkszam,
      ti.nev AS tipus,
      te.nev AS technologia,
      tk.nev AS tokozas,
      COALESCE(
        json_agg(
          t.oldal || '-' || t.sor::text || '-' || t.oszlop::text
          ORDER BY t.oldal, t.sor, t.oszlop
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS helyek
    FROM alkatresz a
    JOIN tipus ti ON ti.id = a.tipus_id
    JOIN technologia te ON te.id = a.technologia_id
    JOIN tokozas tk ON tk.id = a.tokozas_id
    LEFT JOIN tarolo t ON t.alkatresz_id = a.id
    ${where}
    GROUP BY a.id, a.megnevezes, a.cikkszam, ti.nev, te.nev, tk.nev
    ORDER BY a.megnevezes, a.cikkszam
  `);

  return [...sorok].map((sor) => ({
    id: Number(sor.id),
    megnevezes: String(sor.megnevezes),
    cikkszam: String(sor.cikkszam),
    tipus: String(sor.tipus),
    technologia: String(sor.technologia),
    tokozas: String(sor.tokozas),
    helyek: helyek(sor.helyek),
  }));
}

export async function adatlap(id: number): Promise<Adatlap | undefined> {
  const sorok = await db.execute(sql`
    SELECT
      a.id,
      a.megnevezes,
      a.cikkszam,
      a.kep_url,
      a.adatlap_url,
      ti.nev AS tipus,
      te.nev AS technologia,
      tk.nev AS tokozas,
      COALESCE(
        json_agg(
          t.oldal || '-' || t.sor::text || '-' || t.oszlop::text
          ORDER BY t.oldal, t.sor, t.oszlop
        ) FILTER (WHERE t.id IS NOT NULL),
        '[]'::json
      ) AS helyek
    FROM alkatresz a
    JOIN tipus ti ON ti.id = a.tipus_id
    JOIN technologia te ON te.id = a.technologia_id
    JOIN tokozas tk ON tk.id = a.tokozas_id
    LEFT JOIN tarolo t ON t.alkatresz_id = a.id
    WHERE a.id = ${id}
    GROUP BY a.id, a.megnevezes, a.cikkszam, a.kep_url, a.adatlap_url, ti.nev, te.nev, tk.nev
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
    helyek: helyek(sor.helyek),
    kepUrl: String(sor.kep_url),
    adatlapUrl: String(sor.adatlap_url),
    tulajdonsagok: [...tulajdonsagok].map((tul) => ({
      megnevezes: String(tul.megnevezes),
      ertek: String(tul.ertek),
    })),
  };
}
