import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Keret } from "./Keret";

export function Jelszo() {
  const navigate = useNavigate();
  const [jelszo, setJelszo] = useState("");
  const [megerosites, setMegerosites] = useState("");
  const [hiba, setHiba] = useState("");

  useEffect(() => {
    fetch("/api/en", { credentials: "include" })
      .then(async (valasz) => {
        if (!valasz.ok) {
          navigate("/belepes");
          return;
        }
        const en = await valasz.json();
        if (en.jelszoCsere !== true) navigate("/tanar");
      })
      .catch(() => navigate("/belepes"));
  }, [navigate]);

  async function kuldes(esemeny: FormEvent) {
    esemeny.preventDefault();
    setHiba("");
    const valasz = await fetch("/api/jelszo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ jelszo, megerosites }),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A csere nem sikerült.");
      return;
    }
    window.dispatchEvent(new Event("munkamenet"));
    navigate("/tanar");
  }

  return (
    <Keret>
      <div className="belepes-oldal">
        <div className="lap belepes-lap">
          <h2>Jelszócsere</h2>
          <p>Az első belépés után új jelszót kell megadni. Ez később már nem jelenik meg.</p>
          <form className="urlap" onSubmit={kuldes}>
            <label>
              Új jelszó
              <input
                type="password"
                value={jelszo}
                autoComplete="new-password"
                onChange={(esemeny) => setJelszo(esemeny.target.value)}
              />
            </label>
            <label>
              Új jelszó még egyszer
              <input
                type="password"
                value={megerosites}
                autoComplete="new-password"
                onChange={(esemeny) => setMegerosites(esemeny.target.value)}
              />
            </label>
            {hiba ? <p className="panel-allapot hiba">{hiba}</p> : null}
            <button type="submit">Mentés</button>
          </form>
        </div>
      </div>
    </Keret>
  );
}
