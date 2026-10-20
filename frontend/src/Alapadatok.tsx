import { useEffect, useState } from "react";

type Sor = { id: number; nev: string };
type Fajta = "tipus" | "technologia" | "tokozas" | "tulajdonsag";
type Lista = Record<Fajta, Sor[]>;

const fajtak: { id: Fajta; cim: string; szo: string }[] = [
  { id: "tipus", cim: "Típusok", szo: "típust" },
  { id: "technologia", cim: "Technológiák", szo: "technológiát" },
  { id: "tokozas", cim: "Tokozások", szo: "tokozást" },
  { id: "tulajdonsag", cim: "Tulajdonságok", szo: "tulajdonságot" },
];

const ures: Lista = { tipus: [], technologia: [], tokozas: [], tulajdonsag: [] };

export function Alapadatok() {
  const [lista, setLista] = useState<Lista>(ures);
  const [nevek, setNevek] = useState<Record<string, string>>({});
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");

  async function betolt() {
    const valasz = await fetch("/api/alapadatok", { credentials: "include" });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "Az alapadatok nem tölthetők be.");
      return;
    }
    setLista(adat);
    const kovetkezo: Record<string, string> = {};
    for (const fajta of fajtak) {
      for (const sor of adat[fajta.id] as Sor[]) kovetkezo[`${fajta.id}-${sor.id}`] = sor.nev;
    }
    setNevek(kovetkezo);
  }

  useEffect(() => {
    void betolt();
  }, []);

  async function atnevez(fajta: Fajta, sor: Sor) {
    setHiba("");
    setUzenet("");
    const valasz = await fetch(`/api/alapadatok/${fajta}/${sor.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nev: nevek[`${fajta}-${sor.id}`] ?? "" }),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A mentés nem sikerült.");
      return;
    }
    setUzenet("Az alapadat módosítva.");
    await betolt();
  }

  async function torol(fajta: Fajta, szo: string, sor: Sor) {
    setHiba("");
    setUzenet("");
    const hatasValasz = await fetch(`/api/alapadatok/${fajta}/${sor.id}/hatas`, { credentials: "include" });
    const hatas = await hatasValasz.json().catch(() => null);
    if (!hatasValasz.ok) {
      setHiba(hatas?.hiba ?? "A törlés hatása nem tölthető be.");
      return;
    }
    const erintettek = (hatas.alkatreszek as { megnevezes: string; cikkszam: string; helyek: string[] }[]) ?? [];
    const felsorolas =
      erintettek.length === 0
        ? "Ehhez nincs alkatrész rendelve."
        : erintettek
            .map((alkatresz) => {
              const rekesz = alkatresz.helyek.length > 0 ? alkatresz.helyek.join(", ") : "nincs rekesze";
              return `${alkatresz.megnevezes} (${alkatresz.cikkszam}): ${rekesz}`;
            })
            .join("\n");
    const kerdes = `Ha ezt a ${szo} törlöd, ezek az alkatrészek is törlődnek, illetve ezek a rekeszek üressé válnak.\n\n${felsorolas}\n\nBiztosan szeretnéd törölni?`;
    if (!window.confirm(kerdes)) return;
    const valasz = await fetch(`/api/alapadatok/${fajta}/${sor.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A törlés nem sikerült.");
      return;
    }
    setUzenet("Az alapadat és a hozzá tartozó alkatrészek törölve.");
    await betolt();
  }

  return (
    <div className="alapadatok">
      <h2>Alapadatok módosítása</h2>
      {hiba ? <p className="panel-allapot hiba">{hiba}</p> : null}
      {uzenet ? <p className="panel-allapot">{uzenet}</p> : null}
      {fajtak.map((fajta) => (
        <section key={fajta.id}>
          <h3>{fajta.cim}</h3>
          {lista[fajta.id].length === 0 ? <p className="panel-allapot">Nincs ilyen adat.</p> : null}
          {lista[fajta.id].map((sor) => (
            <div className="alap-sor" key={sor.id}>
              <input
                aria-label={fajta.cim}
                value={nevek[`${fajta.id}-${sor.id}`] ?? sor.nev}
                onChange={(esemeny) =>
                  setNevek({ ...nevek, [`${fajta.id}-${sor.id}`]: esemeny.target.value })
                }
              />
              <button type="button" onClick={() => void atnevez(fajta.id, sor)}>
                Mentés
              </button>
              <button type="button" className="veszely" onClick={() => void torol(fajta.id, fajta.szo, sor)}>
                Törlés
              </button>
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
