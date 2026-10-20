import { useState, type FormEvent } from "react";
import { helySzoveg, keres, type Szurok, type Talalat } from "./api";

type Rekesz = { id: number; oldal: string; sor: number; oszlop: number };

const uresSzuro: Szurok = {
  megnevezes: "",
  cikkszam: "",
  tipus: "",
  technologia: "",
  tokozas: "",
};

const mezok: { nev: keyof Szurok; cim: string }[] = [
  { nev: "megnevezes", cim: "Megnevezés" },
  { nev: "cikkszam", cim: "Cikkszám" },
  { nev: "tipus", cim: "Típus" },
  { nev: "technologia", cim: "Technológia" },
  { nev: "tokozas", cim: "Tokozás" },
];

export function Elhelyezes() {
  const [szuro, setSzuro] = useState(uresSzuro);
  const [talalatok, setTalalatok] = useState<Talalat[]>([]);
  const [valasztott, setValasztott] = useState<Talalat | null>(null);
  const [rekeszek, setRekeszek] = useState<Rekesz[]>([]);
  const [oldal, setOldal] = useState("");
  const [sor, setSor] = useState("");
  const [oszlop, setOszlop] = useState("");
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [allapot, setAllapot] = useState("Keresés a meglévő alkatrészek között.");

  async function betolt(kovetkezo: Szurok) {
    setAllapot("Keresés…");
    setHiba("");
    try {
      setTalalatok(await keres(kovetkezo));
      setAllapot("");
    } catch (problema) {
      setTalalatok([]);
      setAllapot(problema instanceof Error ? problema.message : "A keresés nem sikerült.");
    }
  }

  async function kinyit(sorAdat: Talalat) {
    setHiba("");
    setUzenet("");
    const valasz = await fetch(`/api/alkatreszek/${sorAdat.id}/rekeszek`, { credentials: "include" });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A rekeszek nem tölthetők be.");
      return;
    }
    setValasztott(sorAdat);
    setRekeszek(adat);
  }

  async function hozzaad(esemeny: FormEvent) {
    esemeny.preventDefault();
    if (!valasztott) return;
    setHiba("");
    setUzenet("");
    const valasz = await fetch(`/api/alkatreszek/${valasztott.id}/rekeszek`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ oldal, sor: Number(sor), oszlop: Number(oszlop) }),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A hozzárendelés nem sikerült.");
      return;
    }
    setOldal("");
    setSor("");
    setOszlop("");
    await kinyit(valasztott);
    setUzenet("A rekesz hozzá van rendelve.");
    await betolt(szuro);
  }

  async function levesz(rekesz: Rekesz) {
    if (!valasztott) return;
    setHiba("");
    setUzenet("");
    const valasz = await fetch(`/api/alkatreszek/${valasztott.id}/rekeszek/${rekesz.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!valasz.ok) {
      const adat = await valasz.json().catch(() => null);
      setHiba(adat?.hiba ?? "A levétel nem sikerült.");
      return;
    }
    await kinyit(valasztott);
    await betolt(szuro);
  }

  return (
    <div className="tanar-kereso">
      <h2>Alkatrészek elhelyezése</h2>
      {hiba ? <p className="panel-allapot hiba">{hiba}</p> : null}
      {uzenet ? <p className="panel-allapot">{uzenet}</p> : null}
      <form
        onSubmit={(esemeny) => {
          esemeny.preventDefault();
          setValasztott(null);
          void betolt(szuro);
        }}
      >
        {mezok.map((mezo) => (
          <label key={mezo.nev}>
            {mezo.cim}
            <input
              value={szuro[mezo.nev]}
              onChange={(esemeny) => setSzuro({ ...szuro, [mezo.nev]: esemeny.target.value })}
            />
          </label>
        ))}
        <div className="kereso-gombok">
          <button type="submit">Keresés</button>
          <button
            type="button"
            className="masodlagos"
            onClick={() => {
              setSzuro(uresSzuro);
              setValasztott(null);
              setTalalatok([]);
              setAllapot("Keresés a meglévő alkatrészek között.");
            }}
          >
            Keresési beállítások törlése
          </button>
        </div>
      </form>
      {allapot ? <p className="panel-allapot">{allapot}</p> : null}
      {!allapot && talalatok.length === 0 ? <p className="panel-allapot">Nincs találat.</p> : null}
      {valasztott ? (
        <form className="urlap rekesz-urlap" onSubmit={hozzaad}>
          <h2>
            {valasztott.megnevezes} ({valasztott.cikkszam})
          </h2>
          <p className="panel-allapot">Jelenlegi rekeszek: {helySzoveg(rekeszek.map((rekesz) => `${rekesz.oldal}-${rekesz.sor}-${rekesz.oszlop}`))}</p>
          {rekeszek.length > 0 ? (
            <div className="rekesz-lista">
              {rekeszek.map((rekesz) => (
                <div key={rekesz.id}>
                  <span>
                    {rekesz.oldal}-{rekesz.sor}-{rekesz.oszlop}
                  </span>
                  <button type="button" className="masodlagos" onClick={() => void levesz(rekesz)}>
                    Hozzárendelés törlése
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <div className="alkatresz-mezok">
            <label>
              Oldal
              <input value={oldal} onChange={(esemeny) => setOldal(esemeny.target.value)} />
            </label>
            <label>
              Sor
              <input inputMode="numeric" value={sor} onChange={(esemeny) => setSor(esemeny.target.value)} />
            </label>
            <label>
              Oszlop
              <input inputMode="numeric" value={oszlop} onChange={(esemeny) => setOszlop(esemeny.target.value)} />
            </label>
          </div>
          <div className="gomb-sor">
            <button type="submit">Hozzárendelés</button>
            <button type="button" className="masodlagos" onClick={() => setValasztott(null)}>
              Mégse
            </button>
          </div>
        </form>
      ) : null}
      {valasztott == null && talalatok.length > 0 ? (
        <table className="felhasznalok alkatresz-lista">
          <thead>
            <tr>
              <th>Megnevezés</th>
              <th>Cikkszám</th>
              <th>Hely</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {talalatok.map((sorAdat) => (
              <tr key={sorAdat.id}>
                <td>{sorAdat.megnevezes}</td>
                <td>{sorAdat.cikkszam}</td>
                <td className="hely">{helySzoveg(sorAdat.helyek)}</td>
                <td>
                  <button type="button" onClick={() => void kinyit(sorAdat)}>
                    Rekesz hozzárendelése
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}
