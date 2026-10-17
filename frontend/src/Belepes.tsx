import { Link } from "react-router-dom";
import { Keret } from "./Keret";

export function Belepes() {
  return (
    <Keret>
      <div className="lap belepes-lap">
        <h2>Tanári belépés</h2>
        <p>A belépés a tanári felülethez készül. Ezen az oldalon lehet majd adatot feltölteni.</p>
        <Link className="gomb" to="/">
          Vissza a keresőhöz
        </Link>
      </div>
    </Keret>
  );
}
