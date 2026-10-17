import { sql } from "drizzle-orm";
import {
  integer,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

function nevEgyedi(tabla: string) {
  return (table: { nev: unknown }) => [
    uniqueIndex(`${tabla}_nev_lower`).on(sql`lower(${table.nev})`),
  ];
}

export const technologia = pgTable(
  "technologia",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    nev: text("nev").notNull(),
  },
  nevEgyedi("technologia"),
);

export const tipus = pgTable(
  "tipus",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    nev: text("nev").notNull(),
  },
  nevEgyedi("tipus"),
);

export const tokozas = pgTable(
  "tokozas",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    nev: text("nev").notNull(),
  },
  nevEgyedi("tokozas"),
);

export const tulajdonsag = pgTable(
  "tulajdonsag",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    megnevezes: text("megnevezes").notNull(),
  },
  (table) => [
    uniqueIndex("tulajdonsag_megnevezes_lower").on(
      sql`lower(${table.megnevezes})`,
    ),
  ],
);

export const alkatresz = pgTable("alkatresz", {
  id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
  megnevezes: text("megnevezes").notNull(),
  cikkszam: text("cikkszam").notNull().unique(),
  tipusId: integer("tipus_id")
    .notNull()
    .references(() => tipus.id),
  technologiaId: integer("technologia_id")
    .notNull()
    .references(() => technologia.id),
  tokozasId: integer("tokozas_id")
    .notNull()
    .references(() => tokozas.id),
  kepUrl: text("kep_url").notNull(),
  adatlapUrl: text("adatlap_url").notNull(),
  megjegyzes: text("megjegyzes"),
});

export const alkatreszTulajdonsag = pgTable(
  "alkatresz_tulajdonsag",
  {
    alkatreszId: integer("alkatresz_id")
      .notNull()
      .references(() => alkatresz.id, { onDelete: "cascade" }),
    tulajdonsagId: integer("tulajdonsag_id")
      .notNull()
      .references(() => tulajdonsag.id, { onDelete: "restrict" }),
    ertek: text("ertek").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.alkatreszId, table.tulajdonsagId] }),
  ],
);

export const tarolo = pgTable(
  "tarolo",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    oldal: text("oldal").notNull(),
    sor: integer("sor").notNull(),
    oszlop: integer("oszlop").notNull(),
    alkatreszId: integer("alkatresz_id").references(() => alkatresz.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    uniqueIndex("tarolo_cim").on(table.oldal, table.sor, table.oszlop),
  ],
);
