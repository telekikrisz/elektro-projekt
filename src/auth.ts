import { randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";
import { eq, lt, sql } from "drizzle-orm";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { db } from "./db/index.js";
import { munkamenet, tanar } from "./db/schema.js";

const SUTI = "munkamenet";
const ORA = 12;
const SUPER_EMAIL = "superadmin";
const SUPER_JELSZO = "superadmin";

export type Belepett = {
  id: number;
  nev: string;
  email: string;
  szuperadmin: boolean;
  jelszoCsere: boolean;
};

export function szemely(sor: Belepett) {
  return {
    id: sor.id,
    nev: sor.nev,
    email: sor.email,
    szuperadmin: sor.szuperadmin,
    jelszoCsere: sor.jelszoCsere,
  };
}

export async function elsoTanar() {
  const [van] = await db
    .select({ id: tanar.id })
    .from(tanar)
    .where(sql`lower(${tanar.email}) = lower(${SUPER_EMAIL})`);
  if (van) return;

  await db.insert(tanar).values({
    email: SUPER_EMAIL,
    nev: "Superadmin",
    jelszoHash: await hash(SUPER_JELSZO),
    szuperadmin: true,
    jelszoCsere: true,
  });
}

export async function beleptet(email: string, jelszo: string) {
  const [sor] = await db
    .select()
    .from(tanar)
    .where(sql`lower(${tanar.email}) = lower(${email.trim()})`);
  if (!sor || !(await verify(sor.jelszoHash, jelszo))) return null;

  await db.delete(munkamenet).where(lt(munkamenet.lejar, new Date()));
  const token = randomBytes(32).toString("hex");
  const lejar = new Date(Date.now() + ORA * 60 * 60 * 1000);
  await db.insert(munkamenet).values({ token, tanarId: sor.id, lejar });
  return {
    token,
    nev: sor.nev,
    email: sor.email,
    szuperadmin: sor.szuperadmin,
    jelszoCsere: sor.jelszoCsere,
  };
}

export function sutiBeallit(c: Context, token: string) {
  setCookie(c, SUTI, token, {
    httpOnly: true,
    sameSite: "Lax",
    path: "/",
    maxAge: ORA * 60 * 60,
  });
}

export async function aktualisTanar(c: Context): Promise<Belepett | null> {
  const token = getCookie(c, SUTI);
  if (!token) return null;
  const [sor] = await db
    .select({
      id: tanar.id,
      nev: tanar.nev,
      email: tanar.email,
      szuperadmin: tanar.szuperadmin,
      jelszoCsere: tanar.jelszoCsere,
      lejar: munkamenet.lejar,
    })
    .from(munkamenet)
    .innerJoin(tanar, eq(tanar.id, munkamenet.tanarId))
    .where(eq(munkamenet.token, token));
  if (!sor || sor.lejar.getTime() <= Date.now()) {
    if (sor) await db.delete(munkamenet).where(eq(munkamenet.token, token));
    return null;
  }
  return {
    id: sor.id,
    nev: sor.nev,
    email: sor.email,
    szuperadmin: sor.szuperadmin,
    jelszoCsere: sor.jelszoCsere,
  };
}

export async function kijelentkeztet(c: Context) {
  const token = getCookie(c, SUTI);
  if (token) await db.delete(munkamenet).where(eq(munkamenet.token, token));
  deleteCookie(c, SUTI, { path: "/" });
}
