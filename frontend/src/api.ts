export type Talalat = {
  id: number;
  megnevezes: string;
  cikkszam: string;
  tipus: string;
  technologia: string;
  tokozas: string;
  helyek: string[];
};

export type AdatlapAdat = Talalat & {
  kepUrl: string;
  adatlapUrl: string;
  tulajdonsagok: { megnevezes: string; ertek: string }[];
};

export type Szurok = {
  megnevezes: string;
  cikkszam: string;
  tipus: string;
  technologia: string;
  tokozas: string;
};

export function helySzoveg(helyek: string[]) {
  return helyek.length > 0 ? helyek.join(", ") : "nincs rekeszhez rendelve";
}

export async function keres(szurok: Szurok): Promise<Talalat[]> {
  const param = new URLSearchParams();
  for (const [nev, ertek] of Object.entries(szurok)) {
    if (ertek.trim()) param.set(nev, ertek.trim());
  }
  const valasz = await fetch(`/api/kereses?${param}`);
  if (!valasz.ok) throw new Error("A keresés nem sikerült.");
  return valasz.json();
}

export async function adatlap(id: string): Promise<AdatlapAdat> {
  const valasz = await fetch(`/api/alkatresz/${id}`);
  if (valasz.status === 404) throw new Error("Nincs ilyen alkatrész.");
  if (!valasz.ok) throw new Error("Az adatlap nem tölthető be.");
  return valasz.json();
}
