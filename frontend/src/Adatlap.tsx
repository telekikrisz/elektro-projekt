import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { adatlap, type AdatlapAdat } from "./api";
import { Keret } from "./Keret";

export function Adatlap({ id: kapottId, onVissza }: { id?: string; onVissza?: () => void } = {}) {
  const navigate = useNavigate();
  const { id: utId } = useParams();
  const id = kapottId ?? utId;
  const [adat, setAdat] = useState<AdatlapAdat | null>(null);
  const [hiba, setHiba] = useState("");
  const [nagyKep, setNagyKep] = useState(false);

  useEffect(() => {
    if (!id) return;
    let elo = true;
    setAdat(null);
    setHiba("");
    adatlap(id)
      .then((sor) => {
        if (elo) setAdat(sor);
      })
      .catch((probléma) => {
        if (elo) setHiba(probléma instanceof Error ? probléma.message : "Az adatlap nem tölthető be.");
      });
    return () => {
      elo = false;
    };
  }, [id]);

  function keret(tartalom: ReactNode) {
    if (onVissza) return tartalom;
    return <Keret>{tartalom}</Keret>;
  }

  const vissza = (
    <button type="button" className="gomb vissza-gomb" onClick={onVissza ?? (() => navigate("/"))}>
      Vissza a keresőhöz
    </button>
  );

  if (hiba) {
    return keret(
      <div className="adatlap-fej">
        <p className={onVissza ? "allapot panel-allapot" : "allapot"}>{hiba}</p>
        {vissza}
      </div>,
    );
  }

  if (!adat) {
    return keret(
      <p className={onVissza ? "allapot panel-allapot" : "allapot"}>Betöltés…</p>,
    );
  }

  const helyek = adat.helyek.length > 0 ? adat.helyek : ["nincs rekeszhez rendelve"];

  return keret(
    <>
      <div className={onVissza ? undefined : "lap"}>
        <header className="fejlec">
          <div className="adatlap-fej">
            <h2>{adat.megnevezes}</h2>
            <div className="helyek">
              {helyek.map((hely) => (
                <div className="hely-kartya" key={hely}>
                  {hely}
                </div>
              ))}
            </div>
            {vissza}
          </div>
          <p>
            {adat.cikkszam} · {adat.tipus} · {adat.technologia} · {adat.tokozas}
          </p>
        </header>

        <section className="adatlap">
          <button type="button" className="kepgomb" aria-label="Nagy kép" onClick={() => setNagyKep(true)}>
            <img src={adat.kepUrl} alt={adat.megnevezes} />
          </button>

          <div>
            <table>
              <caption>Tulajdonságok</caption>
              <tbody>
                {adat.tulajdonsagok.map((sor) => (
                  <tr key={sor.megnevezes}>
                    <th scope="row">{sor.megnevezes}</th>
                    <td>{sor.ertek}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div className="adatlap-kozep">
          <a className="gomb adatlap-gomb" href={adat.adatlapUrl} target="_blank" rel="noreferrer">
            Adatlap
          </a>
        </div>

        {nagyKep ? (
          <div className="fuggony" onClick={() => setNagyKep(false)}>
            <button type="button" className="bezaras" onClick={() => setNagyKep(false)}>
              Bezárás
            </button>
            <img src={adat.kepUrl} alt={adat.megnevezes} />
          </div>
        ) : null}
      </div>
    </>,
  );
}
