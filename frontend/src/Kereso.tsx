import { useEffect, useLayoutEffect, useState, type FormEvent } from "react";
import { helySzoveg, keres, type Szurok, type Talalat } from "./api";
import { Adatlap } from "./Adatlap";
import { Keret } from "./Keret";

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

function becsultMeret() {
  const sor = 60;
  const foglalt = 104 + 49 + 52 + 32 + 73 + 25 + 64;
  return Math.max(1, Math.floor((window.innerHeight - foglalt) / sor));
}

export function Kereso() {
  const [szuro, setSzuro] = useState(uresSzuro);
  const [talalatok, setTalalatok] = useState<Talalat[]>([]);
  const [allapot, setAllapot] = useState("Betöltés…");

  const [oldal, setOldal] = useState(1);
  const [meret, setMeret] = useState(becsultMeret);
  const [nyitott, setNyitott] = useState<number | null>(null);

  async function betolt(kovetkezo: Szurok) {
    setAllapot("Keresés…");
    setOldal(1);
    try {
      setTalalatok(await keres(kovetkezo));
      setAllapot("");
    } catch (hiba) {
      setTalalatok([]);
      setAllapot(hiba instanceof Error ? hiba.message : "A keresés nem sikerült.");
    }
  }

  useEffect(() => {
    void betolt(uresSzuro);
  }, []);

  function kuldes(esemeny: FormEvent) {
    esemeny.preventDefault();
    setNyitott(null);
    void betolt(szuro);
  }

  function torles() {
    setNyitott(null);
    setSzuro(uresSzuro);
    void betolt(uresSzuro);
  }

  useLayoutEffect(() => {
    if (nyitott != null || talalatok.length === 0) return;

    function illeszt() {
      const asztal = document.querySelector(".asztal");
      const asztalLatszik = asztal != null && getComputedStyle(asztal).display !== "none";
      const sorEl = asztalLatszik
        ? document.querySelector(".adat-sor")
        : document.querySelector(".kartya");
      if (!sorEl) return;
      const sorMag = sorEl.getBoundingClientRect().height;
      if (sorMag < 1) return;

      const felesleg = document.documentElement.scrollHeight - window.innerHeight;
      if (felesleg > 0) {
        const csokk = Math.max(1, Math.ceil(felesleg / sorMag));
        setMeret((jelenlegi) => Math.max(1, jelenlegi - csokk));
        return;
      }

      const hely = window.innerHeight - document.documentElement.scrollHeight;
      if (hely < sorMag + 8) return;
      const plusz = Math.floor((hely - 8) / sorMag);
      setMeret((jelenlegi) => Math.min(talalatok.length, jelenlegi + plusz));
    }

    illeszt();
    window.addEventListener("resize", illeszt);
    return () => window.removeEventListener("resize", illeszt);
  }, [talalatok, nyitott, meret, allapot]);

  const lapokSzama = Math.max(1, Math.ceil(talalatok.length / meret));
  const aktualisOldal = Math.min(oldal, lapokSzama);
  const lathato = talalatok.slice((aktualisOldal - 1) * meret, aktualisOldal * meret);

  return (
    <Keret>
      <div className="munka">
      {nyitott == null ? (
      <form className="racs" onSubmit={kuldes}>
        {mezok.map((mezo) => (
          <label key={mezo.nev}>
            {mezo.cim}
            <input
              value={szuro[mezo.nev]}
              onChange={(esemeny) =>
                setSzuro({ ...szuro, [mezo.nev]: esemeny.target.value })
              }
            />
          </label>
        ))}
        <div className="gombok">
          <button type="submit">Keresés</button>
          <button type="button" className="masodlagos" onClick={torles}>
            Keresési beállítások törlése
          </button>
        </div>
      </form>
      ) : null}

      {nyitott == null && allapot ? <p className="allapot panel-allapot">{allapot}</p> : null}
      {nyitott == null && !allapot && talalatok.length === 0 ? <p className="allapot panel-allapot">Nincs találat.</p> : null}

      {nyitott != null ? (
        <Adatlap id={String(nyitott)} onVissza={() => setNyitott(null)} />
      ) : null}

      {nyitott == null && talalatok.length > 0 ? (
        <>
          <div className="asztal">
            <div className="racs oszlopnevek">
              {mezok.map((mezo) => (
                <span key={mezo.nev}>{mezo.cim}</span>
              ))}
              <span>Hely</span>
              <span />
            </div>
            {lathato.map((sor) => (
              <div className="racs adat-sor" key={sor.id}>
                <span>{sor.megnevezes}</span>
                <span>{sor.cikkszam}</span>
                <span>{sor.tipus}</span>
                <span>{sor.technologia}</span>
                <span>{sor.tokozas}</span>
                <span className="hely">{helySzoveg(sor.helyek)}</span>
                <button type="button" className="gomb" onClick={() => setNyitott(sor.id)}>
                  Megtekintés
                </button>
              </div>
            ))}
          </div>

          <div className="kartyak">
            {lathato.map((sor) => (
              <article key={sor.id} className="kartya">
                <h2>{sor.megnevezes}</h2>
                <dl>
                  <div><dt>Cikkszám</dt><dd>{sor.cikkszam}</dd></div>
                  <div><dt>Típus</dt><dd>{sor.tipus}</dd></div>
                  <div><dt>Technológia</dt><dd>{sor.technologia}</dd></div>
                  <div><dt>Tokozás</dt><dd>{sor.tokozas}</dd></div>
                  <div><dt>Hely</dt><dd>{helySzoveg(sor.helyek)}</dd></div>
                </dl>
                <button type="button" className="gomb" onClick={() => setNyitott(sor.id)}>
                  Megtekintés
                </button>
              </article>
            ))}
          </div>
          {lapokSzama > 1 ? (
            <nav className="lapozo" aria-label="Lapozás">
              <button type="button" disabled={aktualisOldal === 1} onClick={() => setOldal(aktualisOldal - 1)}>
                Előző
              </button>
              {Array.from({ length: lapokSzama }, (_, index) => index + 1).map((szam) => (
                <button
                  key={szam}
                  type="button"
                  aria-current={szam === aktualisOldal ? "page" : undefined}
                  onClick={() => setOldal(szam)}
                >
                  {szam}
                </button>
              ))}
              <button
                type="button"
                disabled={aktualisOldal === lapokSzama}
                onClick={() => setOldal(aktualisOldal + 1)}
              >
                Következő
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
      </div>
    </Keret>
  );
}
