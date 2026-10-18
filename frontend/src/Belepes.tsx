import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Keret } from "./Keret";

export function Belepes() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("superadmin");
  const [jelszo, setJelszo] = useState("superadmin");
  const [hiba, setHiba] = useState("");

  async function kuldes(esemeny: FormEvent) {
    esemeny.preventDefault();
    setHiba("");
    const valasz = await fetch("/api/belepes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, jelszo }),
    });
    const adat = await valasz.json().catch(() => null);
    if (!valasz.ok) {
      setHiba(adat?.hiba ?? "A belépés nem sikerült.");
      return;
    }
    navigate(adat.jelszoCsere === true ? "/jelszo" : "/tanar");
  }

  return (
    <Keret>
      <div className="belepes-oldal">
      <div className="lap belepes-lap">
        <h2>Tanári belépés</h2>
        <form className="urlap" onSubmit={kuldes}>
          <label>
            E-mail
            <input
              value={email}
              autoComplete="username"
              onChange={(esemeny) => setEmail(esemeny.target.value)}
            />
          </label>
          <label>
            Jelszó
            <input
              type="password"
              value={jelszo}
              autoComplete="current-password"
              onChange={(esemeny) => setJelszo(esemeny.target.value)}
            />
          </label>
          {hiba ? <p className="panel-allapot">{hiba}</p> : null}
          <button type="submit">Belépés</button>
        </form>
      </div>
      </div>
    </Keret>
  );
}
