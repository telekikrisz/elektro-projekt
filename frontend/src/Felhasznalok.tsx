import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

type Sor = { id: number; nev: string; email: string; szuperadmin: boolean };
export type FelhasznaloResz = "uj" | "lista" | "sajat";

export function Felhasznalok({
  resz,
  enId,
  szuperadmin,
  nev,
  email,
  onSajat,
}: {
  resz: FelhasznaloResz;
  enId: number;
  szuperadmin: boolean;
  nev: string;
  email: string;
  onSajat: (adat: { nev: string; email: string }) => void;
}) {
  const navigate = useNavigate();
  const [lista, setLista] = useState<Sor[]>([]);
  const [hiba, setHiba] = useState("");
  const [uzenet, setUzenet] = useState("");
  const [ujNev, setUjNev] = useState("");
  const [ujEmail, setUjEmail] = useState("");
  const [ujJelszo, setUjJelszo] = useState("");
  const [sajatNev, setSajatNev] = useState(nev);
  const [sajatEmail, setSajatEmail] = useState(email);
  const [sajatJelszo, setSajatJelszo] = useState("");
  const [szerkesztes, setSzerkesztes] = useState<number | null>(null);
  const [modNev, setModNev] = useState("");
  const [modEmail, setModEmail] = useState("");
  const [modJelszo, setModJelszo] = useState("");

  async function betolt() {
    const valasz = await fetch("/api/felhasznalok", { credentials: "include" });
    if (!valasz.ok) return;
    setLista(await valasz.json());
  }

  useEffect(() => {
    void betolt();
  }, []);

  useEffect(() => {
    setSajatNev(nev);
    setSajatEmail(email);
  }, [nev, email]);

  async function letrehoz(esemeny: FormEvent) {
    esemeny.preventDefault();
    setHiba("");
    setUzenet("");
    const valasz = await fetch("/api/felhasznalok", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nev: ujNev, email: ujEmail, jelszo: ujJelszo }),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A létrehozás nem sikerült.");
      return;
    }
    setUjNev("");
    setUjEmail("");
    setUjJelszo("");
    setUzenet("A felhasználó elkészült. Az első belépéskor jelszót kell cserélnie.");
    await betolt();
  }

  async function sajatMent(esemeny: FormEvent) {
    esemeny.preventDefault();
    setHiba("");
    setUzenet("");
    const valasz = await fetch("/api/felhasznalok/sajat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nev: sajatNev, email: sajatEmail, jelszo: sajatJelszo }),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A mentés nem sikerült.");
      return;
    }
    setSajatJelszo("");
    setUzenet("A saját adatok mentve.");
    onSajat({ nev: adat.nev, email: adat.email });
    await betolt();
  }

  async function sajatTorol() {
    if (!window.confirm("Biztosan törlöd a saját fiókodat?")) return;
    const valasz = await fetch("/api/felhasznalok/sajat", {
      method: "DELETE",
      credentials: "include",
    });
    if (!valasz.ok) {
      const adat = await valasz.json().catch(() => null);
      setHiba(adat?.hiba ?? "A törlés nem sikerült.");
      return;
    }
    window.dispatchEvent(new Event("munkamenet"));
    navigate("/");
  }

  function szerkeszt(sor: Sor) {
    setSzerkesztes(sor.id);
    setModNev(sor.nev);
    setModEmail(sor.email);
    setModJelszo("");
    setHiba("");
    setUzenet("");
  }

  async function masikatMent(esemeny: FormEvent) {
    esemeny.preventDefault();
    if (szerkesztes == null) return;
    setHiba("");
    setUzenet("");
    const valasz = await fetch(`/api/felhasznalok/${szerkesztes}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ nev: modNev, email: modEmail, jelszo: modJelszo }),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A mentés nem sikerült.");
      return;
    }
    setSzerkesztes(null);
    setUzenet("A felhasználó módosítva.");
    if (szerkesztes === enId) onSajat({ nev: modNev, email: modEmail });
    await betolt();
  }

  async function torol(sor: Sor) {
    if (!window.confirm(`Törlöd ezt a felhasználót: ${sor.nev}?`)) return;
    const valasz = await fetch(`/api/felhasznalok/${sor.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!valasz.ok) {
      const adat = await valasz.json().catch(() => null);
      setHiba(adat?.hiba ?? "A törlés nem sikerült.");
      return;
    }
    if (sor.id === enId) {
      window.dispatchEvent(new Event("munkamenet"));
      navigate("/");
      return;
    }
    await betolt();
  }

  return (
    <div className="felhasznalo-resz">
      {hiba ? <p className="panel-allapot hiba">{hiba}</p> : null}
      {uzenet ? <p className="panel-allapot">{uzenet}</p> : null}

      {resz === "uj" ? (
        <form className="urlap" onSubmit={letrehoz}>
          <h2>Új felhasználó létrehozása</h2>
          <label>
            Név
            <input value={ujNev} onChange={(esemeny) => setUjNev(esemeny.target.value)} />
          </label>
          <label>
            E-mail
            <input value={ujEmail} onChange={(esemeny) => setUjEmail(esemeny.target.value)} />
          </label>
          <label>
            Jelszó
            <input
              type="password"
              value={ujJelszo}
              onChange={(esemeny) => setUjJelszo(esemeny.target.value)}
            />
          </label>
          <button type="submit">Létrehozás</button>
        </form>
      ) : null}

      {resz === "lista" ? (
        <>
          <h2>Felhasználók listázása</h2>
          <table className="felhasznalok">
            <thead>
              <tr>
                <th>Név</th>
                <th>E-mail</th>
                {szuperadmin ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {lista.map((sor) => (
                <tr key={sor.id}>
                  <td>{sor.nev}</td>
                  <td>{sor.email}</td>
                  {szuperadmin ? (
                    <td className="sor-gombok">
                      <button type="button" onClick={() => szerkeszt(sor)}>
                        Módosítás
                      </button>
                      <button type="button" className="veszely" onClick={() => torol(sor)}>
                        Törlés
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {szerkesztes != null ? (
            <form className="urlap" onSubmit={masikatMent}>
              <h2>Felhasználó módosítása</h2>
              <label>
                Név
                <input value={modNev} onChange={(esemeny) => setModNev(esemeny.target.value)} />
              </label>
              <label>
                E-mail
                <input value={modEmail} onChange={(esemeny) => setModEmail(esemeny.target.value)} />
              </label>
              <label>
                Új jelszó
                <input
                  type="password"
                  value={modJelszo}
                  onChange={(esemeny) => setModJelszo(esemeny.target.value)}
                />
              </label>
              <button type="submit">Mentés</button>
            </form>
          ) : null}
        </>
      ) : null}

      {resz === "sajat" ? (
        <form className="urlap" onSubmit={sajatMent}>
          <h2>Saját adatok módosítása</h2>
          <label>
            Név
            <input value={sajatNev} onChange={(esemeny) => setSajatNev(esemeny.target.value)} />
          </label>
          <label>
            E-mail
            <input value={sajatEmail} onChange={(esemeny) => setSajatEmail(esemeny.target.value)} />
          </label>
          <label>
            Új jelszó
            <input
              type="password"
              value={sajatJelszo}
              autoComplete="new-password"
              onChange={(esemeny) => setSajatJelszo(esemeny.target.value)}
            />
          </label>
          <div className="gomb-sor">
            <button type="submit">Mentés</button>
            <button type="button" className="veszely" onClick={sajatTorol}>
              Saját fiók törlése
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
