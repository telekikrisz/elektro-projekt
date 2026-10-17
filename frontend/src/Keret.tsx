import { Link } from "react-router-dom";
import type { ReactNode } from "react";

export function Keret({ children }: { children: ReactNode }) {
  return (
    <div className="keret">
      <div className="keret-hatter" aria-hidden />
      <div className="keret-arnyek" aria-hidden />
      <header className="fejlecsav">
        <img className="fejlec-cimer" src="/cimer.png" alt="Az iskola címere" />
        <h1>Elektronikai alkatrészkereső</h1>
        <Link className="belepes" to="/belepes">
          Belépés
        </Link>
      </header>
      <div className="keret-tartalom">{children}</div>
      <footer className="lablec">
        <span>Teleki Alkatrészkereső</span>
      </footer>
    </div>
  );
}
