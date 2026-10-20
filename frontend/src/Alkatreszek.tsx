import { useEffect, useState, type FormEvent } from "react";
import { Alapadatok } from "./Alapadatok";
import { helySzoveg, keres, type Szurok, type Talalat } from "./api";
import { Elhelyezes } from "./Elhelyezes";

export type AlkatreszResz = "uj" | "lista" | "hely" | "alap";

type Tulajdonsag = { megnevezes: string; ertek: string };

type UrlapAdat = {
  megnevezes: string;
  cikkszam: string;
  tipus: string;
  technologia: string;
  tokozas: string;
  kepUrl: string;
  adatlapUrl: string;
  megjegyzes: string;
  tulajdonsagok: Tulajdonsag[];
};

const uresUrlap = (): UrlapAdat => ({
  megnevezes: "",
  cikkszam: "",
  tipus: "",
  technologia: "",
  tokozas: "",
  kepUrl: "",
  adatlapUrl: "",
  megjegyzes: "",
  tulajdonsagok: [],
});

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

export function Alkatreszek({ resz }: { resz: AlkatreszResz }) {
  const [urlap, setUrlap] = useState<UrlapAdat>(uresUrlap);
  const [szerkesztes, setSzerkesztes] = useState<number | null>(null);
  const [szuro, setSzuro] = useState(uresSzuro);
  const [talalatok, setTalalatok] = useState<Talalat[]>([]);
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [allapot, setAllapot] = useState("");

  function mezo(nev: keyof UrlapAdat, ertek: string) {
    setUrlap({ ...urlap, [nev]: ertek });
  }

  function tulajdonsag(index: number, nev: keyof Tulajdonsag, ertek: string) {
    const kovetkezo = urlap.tulajdonsagok.map((sor, hely) =>
      hely === index ? { ...sor, [nev]: ertek } : sor,
    );
    setUrlap({ ...urlap, tulajdonsagok: kovetkezo });
  }

  async function betolt(kovetkezo: Szurok) {
    setAllapot("Keresés…");
    setHiba("");
    try {
      setTalalatok(await keres(kovetkezo));
      setAllapot("");
    } catch (probléma) {
      setTalalatok([]);
      setAllapot(probléma instanceof Error ? probléma.message : "A keresés nem sikerült.");
    }
  }

  useEffect(() => {
    if (resz === "lista") void betolt(uresSzuro);
  }, [resz]);

  const modositas = resz === "lista" ? szerkesztes : null;

  async function ment(esemeny: FormEvent) {
    esemeny.preventDefault();
    setHiba("");
    setUzenet("");
    const cim = modositas == null ? "/api/alkatreszek" : `/api/alkatreszek/${modositas}`;
    const valasz = await fetch(cim, {
      method: modositas == null ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(urlap),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A mentés nem sikerült.");
      return;
    }
    if (modositas == null) {
      setUrlap(uresUrlap());
      setUzenet("Az alkatrész elkészült.");
      return;
    }
    setSzerkesztes(null);
    setUzenet("Az alkatrész módosítva.");
    await betolt(szuro);
  }

  async function szerkeszt(sor: Talalat) {
    setHiba("");
    setUzenet("");
    const valasz = await fetch(`/api/alkatreszek/${sor.id}`, { credentials: "include" });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "Az alkatrész nem tölthető be.");
      return;
    }
    setUrlap({
      megnevezes: adat.megnevezes,
      cikkszam: adat.cikkszam,
      tipus: adat.tipus,
      technologia: adat.technologia,
      tokozas: adat.tokozas,
      kepUrl: adat.kepUrl,
      adatlapUrl: adat.adatlapUrl,
      megjegyzes: adat.megjegyzes,
      tulajdonsagok: adat.tulajdonsagok,
    });
    setSzerkesztes(sor.id);
  }

  async function torol(sor: Talalat) {
    if (!window.confirm(`Törlöd ezt az alkatrészt: ${sor.megnevezes}?`)) return;
    setHiba("");
    setUzenet("");
    const valasz = await fetch(`/api/alkatreszek/${sor.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!valasz.ok) {
      const adat = await valasz.json().catch(() => null);
      setHiba(adat?.hiba ?? "A törlés nem sikerült.");
      return;
    }
    if (szerkesztes === sor.id) setSzerkesztes(null);
    await betolt(szuro);
  }

  const urlapMezok: { nev: keyof UrlapAdat; cim: string }[] = [
    { nev: "megnevezes", cim: "Megnevezés" },
    { nev: "cikkszam", cim: "Cikkszám" },
    { nev: "tipus", cim: "Típus" },
    { nev: "technologia", cim: "Technológia" },
    { nev: "tokozas", cim: "Tokozás" },
    { nev: "kepUrl", cim: "Kép címe" },
    { nev: "adatlapUrl", cim: "Adatlap címe" },
    { nev: "megjegyzes", cim: "Megjegyzés" },
  ];

  const mezokJsx = urlapMezok.map((mezoAdat) => (
    <label key={mezoAdat.nev}>
      {mezoAdat.cim}
      <input
        value={String(urlap[mezoAdat.nev])}
        onChange={(esemeny) => mezo(mezoAdat.nev, esemeny.target.value)}
      />
    </label>
  ));

  const form = (
    <form className={modositas == null ? "urlap alkatresz-urlap" : "urlap"} onSubmit={ment}>
      <h2>{modositas == null ? "Új alkatrész felvitele" : "Alkatrész módosítása"}</h2>
      {modositas == null ? <div className="alkatresz-mezok">{mezokJsx}</div> : mezokJsx}
      <div className="tulajdonsagok">
        <span>Tulajdonságok</span>
        {urlap.tulajdonsagok.length === 0 ? (
          <button
            type="button"
            className="masodlagos"
            onClick={() => setUrlap({ ...urlap, tulajdonsagok: [{ megnevezes: "", ertek: "" }] })}
          >
            Tulajdonság hozzáadása
          </button>
        ) : null}
        {urlap.tulajdonsagok.map((sor, index) => (
          <div className="tulajdonsag-sor" key={index}>
            <input
              aria-label="Tulajdonság neve"
              placeholder="Név"
              value={sor.megnevezes}
              onChange={(esemeny) => tulajdonsag(index, "megnevezes", esemeny.target.value)}
            />
            <input
              aria-label="Tulajdonság értéke"
              placeholder="Érték"
              value={sor.ertek}
              onChange={(esemeny) => tulajdonsag(index, "ertek", esemeny.target.value)}
            />
            <button
              type="button"
              className="masodlagos"
              onClick={() =>
                setUrlap({ ...urlap, tulajdonsagok: [...urlap.tulajdonsagok, { megnevezes: "", ertek: "" }] })
              }
            >
              Hozzáadás
            </button>
            <button
              type="button"
              className="masodlagos"
              onClick={() =>
                setUrlap({
                  ...urlap,
                  tulajdonsagok: urlap.tulajdonsagok.filter((_, hely) => hely !== index),
                })
              }
            >
              Törlés
            </button>
          </div>
        ))}
      </div>
      <div className="gomb-sor">
        <button type="submit">{modositas == null ? "Alkatrész rögzítése" : "Mentés"}</button>
        {modositas != null ? (
          <button
            type="button"
            className="masodlagos"
            onClick={() => {
              setSzerkesztes(null);
              setUrlap(uresUrlap());
            }}
          >
            Mégse
          </button>
        ) : null}
      </div>
    </form>
  );

  return (
    <div className="alkatresz-resz">
      {hiba ? <p className="panel-allapot hiba">{hiba}</p> : null}
      {uzenet ? <p className="panel-allapot">{uzenet}</p> : null}
      {resz === "uj" ? form : null}
      {resz === "hely" ? <Elhelyezes /> : null}
      {resz === "alap" ? <Alapadatok /> : null}
      {resz === "lista" ? (
        <div className="tanar-kereso">
          <form
            onSubmit={(esemeny) => {
              esemeny.preventDefault();
              setSzerkesztes(null);
              void betolt(szuro);
            }}
          >
            {mezok.map((mezoAdat) => (
              <label key={mezoAdat.nev}>
                {mezoAdat.cim}
                <input
                  value={szuro[mezoAdat.nev]}
                  onChange={(esemeny) => setSzuro({ ...szuro, [mezoAdat.nev]: esemeny.target.value })}
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
                  setSzerkesztes(null);
                  void betolt(uresSzuro);
                }}
              >
                Keresési beállítások törlése
              </button>
            </div>
          </form>
          {allapot ? <p className="panel-allapot">{allapot}</p> : null}
          {!allapot && talalatok.length === 0 ? <p className="panel-allapot">Nincs találat.</p> : null}
          {szerkesztes != null ? form : null}
          {szerkesztes == null && talalatok.length > 0 ? (
            <table className="felhasznalok alkatresz-lista">
              <thead>
                <tr>
                  <th>Megnevezés</th>
                  <th>Cikkszám</th>
                  <th>Típus</th>
                  <th>Technológia</th>
                  <th>Tokozás</th>
                  <th>Hely</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {talalatok.map((sor) => (
                  <tr key={sor.id}>
                    <td>{sor.megnevezes}</td>
                    <td>{sor.cikkszam}</td>
                    <td>{sor.tipus}</td>
                    <td>{sor.technologia}</td>
                    <td>{sor.tokozas}</td>
                    <td className="hely">{helySzoveg(sor.helyek)}</td>
                    <td className="sor-gombok">
                      <button type="button" onClick={() => void szerkeszt(sor)}>
                        Módosítás
                      </button>
                      <button type="button" className="veszely" onClick={() => void torol(sor)}>
                        Törlés
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
