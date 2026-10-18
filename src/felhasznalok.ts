import { hash } from "@node-rs/argon2";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "./db/index.js";
import { tanar } from "./db/schema.js";

function jelszoEllenoriz(jelszo: string) {
  if (jelszo.length < 4) throw new Error("A jelszó legalább 4 karakter legyen.");
}

async function foglalt(email: string, kiveve?: number) {
  const [sor] = await db
    .select({ id: tanar.id })
    .from(tanar)
    .where(sql`lower(${tanar.email}) = lower(${email})`);
  return sor != null && sor.id !== kiveve;
}

export async function jelszotCserel(id: number, jelszo: string) {
  jelszoEllenoriz(jelszo);
  await db
    .update(tanar)
    .set({ jelszoHash: await hash(jelszo), jelszoCsere: false })
    .where(eq(tanar.id, id));
}

export async function felhasznalokListaja() {
  return db
    .select({
      id: tanar.id,
      nev: tanar.nev,
      email: tanar.email,
      szuperadmin: tanar.szuperadmin,
    })
    .from(tanar)
    .orderBy(asc(tanar.nev));
}

export async function felhasznalotLetrehoz(nev: string, email: string, jelszo: string) {
  const tisztaNev = nev.trim();
  const tisztaEmail = email.trim();
  if (!tisztaNev || !tisztaEmail) throw new Error("A név és az e-mail kötelező.");
  jelszoEllenoriz(jelszo);
  if (await foglalt(tisztaEmail)) throw new Error("Ez az e-mail már foglalt.");
  await db.insert(tanar).values({
    nev: tisztaNev,
    email: tisztaEmail,
    jelszoHash: await hash(jelszo),
    szuperadmin: false,
    jelszoCsere: true,
  });
}

export async function sajatotModosit(
  id: number,
  nev: string,
  email: string,
  jelszo: string,
) {
  const tisztaNev = nev.trim();
  const tisztaEmail = email.trim();
  if (!tisztaNev || !tisztaEmail) throw new Error("A név és az e-mail kötelező.");
  if (await foglalt(tisztaEmail, id)) throw new Error("Ez az e-mail már foglalt.");
  const valtozas: { nev: string; email: string; jelszoHash?: string; jelszoCsere?: boolean } = {
    nev: tisztaNev,
    email: tisztaEmail,
  };
  if (jelszo) {
    jelszoEllenoriz(jelszo);
    valtozas.jelszoHash = await hash(jelszo);
    valtozas.jelszoCsere = false;
  }
  await db.update(tanar).set(valtozas).where(eq(tanar.id, id));
  return { nev: tisztaNev, email: tisztaEmail };
}

export async function felhasznalotModosit(
  id: number,
  nev: string,
  email: string,
  jelszo: string,
) {
  const [van] = await db.select({ id: tanar.id }).from(tanar).where(eq(tanar.id, id));
  if (!van) throw new Error("Nincs ilyen felhasználó.");
  const tisztaNev = nev.trim();
  const tisztaEmail = email.trim();
  if (!tisztaNev || !tisztaEmail) throw new Error("A név és az e-mail kötelező.");
  if (await foglalt(tisztaEmail, id)) throw new Error("Ez az e-mail már foglalt.");
  const valtozas: { nev: string; email: string; jelszoHash?: string; jelszoCsere?: boolean } = {
    nev: tisztaNev,
    email: tisztaEmail,
  };
  if (jelszo) {
    jelszoEllenoriz(jelszo);
    valtozas.jelszoHash = await hash(jelszo);
    valtozas.jelszoCsere = true;
  }
  await db.update(tanar).set(valtozas).where(eq(tanar.id, id));
}

export async function felhasznalotTorol(id: number) {
  const [van] = await db.select({ id: tanar.id }).from(tanar).where(eq(tanar.id, id));
  if (!van) throw new Error("Nincs ilyen felhasználó.");
  await db.delete(tanar).where(eq(tanar.id, id));
}
