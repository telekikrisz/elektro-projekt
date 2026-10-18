import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
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

export const tanar = pgTable(
  "tanar",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    email: text("email").notNull(),
    nev: text("nev").notNull(),
    jelszoHash: text("jelszo_hash").notNull(),
    szuperadmin: boolean("szuperadmin").notNull().default(false),
    jelszoCsere: boolean("jelszo_csere").notNull().default(true),
  },
  (table) => [uniqueIndex("tanar_email_lower").on(sql`lower(${table.email})`)],
);

export const munkamenet = pgTable("munkamenet", {
  token: text("token").primaryKey(),
  tanarId: integer("tanar_id")
    .notNull()
    .references(() => tanar.id, { onDelete: "cascade" }),
  lejar: timestamp("lejar", { withTimezone: true }).notNull(),
});

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
