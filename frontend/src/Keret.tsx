import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export function Keret({ children }: { children: ReactNode }) {
  const hely = useLocation();
  const navigate = useNavigate();
  const [szemely, setSzemely] = useState<{ nev: string } | null>(null);

  async function kilepes() {
    await fetch("/api/kilepes", { method: "POST", credentials: "include" });
    setSzemely(null);
    navigate("/");
  }

  useEffect(() => {
    function frissit() {
      fetch("/api/en", { credentials: "include" })
        .then(async (valasz) => setSzemely(valasz.ok ? await valasz.json() : null))
        .catch(() => setSzemely(null));
    }
    frissit();
    window.addEventListener("munkamenet", frissit);
    return () => window.removeEventListener("munkamenet", frissit);
  }, [hely.pathname]);

  return (
    <div className="keret">
      <div className="keret-hatter" aria-hidden />
      <div className="keret-arnyek" aria-hidden />
      <header className="fejlecsav">
        <img className="fejlec-cimer" src="/cimer.png" alt="Az iskola címere" />
        <h1>Elektronikai alkatrészkereső</h1>
        {hely.pathname === "/belepes" ? (
          <Link className="belepes" to="/">
            Vissza
          </Link>
        ) : szemely ? (
          <button type="button" className="belepes" onClick={kilepes}>
            Kilépés
          </button>
        ) : (
          <Link className="belepes" to="/belepes">
            Belépés
          </Link>
        )}
      </header>
      <div className="keret-tartalom">{children}</div>
      <footer className="lablec">{szemely ? <span>{szemely.nev}</span> : null}</footer>
    </div>
  );
}
