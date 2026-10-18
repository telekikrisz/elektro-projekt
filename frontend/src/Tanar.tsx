import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Felhasznalok, type FelhasznaloResz } from "./Felhasznalok";
import { Keret } from "./Keret";

export function Tanar() {
  const navigate = useNavigate();
  const [en, setEn] = useState<{ id: number; nev: string; email: string; szuperadmin: boolean } | null>(null);
  const [alkatreszek, setAlkatreszek] = useState<number | null>(null);
  const [fajl, setFajl] = useState<File | null>(null);
  const [valaszto, setValaszto] = useState(0);
  const [uzenet, setUzenet] = useState("");
  const [hiba, setHiba] = useState("");
  const [tolt, setTolt] = useState(false);
  const [menu, setMenu] = useState<"felhasznalok" | "alkatreszek" | "import">("alkatreszek");
  const [resz, setResz] = useState<FelhasznaloResz>("uj");

  const menuk = [
    { id: "alkatreszek" as const, cim: "Alkatrészek kezelése" },
    { id: "import" as const, cim: "Export/import" },
    { id: "felhasznalok" as const, cim: "Felhasználók kezelése" },
  ];
  const reszek: { id: FelhasznaloResz; cim: string }[] = [
    { id: "uj", cim: "Új felhasználó létrehozása" },
    { id: "lista", cim: "Felhasználók listázása" },
    { id: "sajat", cim: "Saját adatok módosítása" },
  ];

  async function frissit() {
    const valasz = await fetch("/api/en", { credentials: "include" });
    if (!valasz.ok) {
      navigate("/belepes");
      return;
    }
    const szemely = await valasz.json();
    if (szemely.jelszoCsere === true) {
      navigate("/jelszo");
      return;
    }
    setEn(szemely);
    const osszes = await fetch("/api/tanar/osszesites", { credentials: "include" });
    if (osszes.ok) {
      const adat = await osszes.json();
      setAlkatreszek(adat.alkatreszek);
    }
  }

  useEffect(() => {
    void frissit();
  }, []);

  async function feltolt(esemeny: FormEvent) {
    esemeny.preventDefault();
    if (!fajl) {
      setHiba("Válassz egy Excel-fájlt.");
      setUzenet("");
      return;
    }
    setTolt(true);
    setHiba("");
    setUzenet("");
    const adat = new FormData();
    adat.set("fajl", fajl);
    const valasz = await fetch("/api/import", {
      method: "POST",
      credentials: "include",
      body: adat,
    });
    const eredmeny = await valasz.json().catch(() => null);
    setTolt(false);
    if (!valasz.ok) {
      setHiba(eredmeny?.hiba ?? "A feltöltés nem sikerült.");
      return;
    }
    setUzenet(`${eredmeny.betoltve} alkatrész betöltve. A rekeszek változatlanok.`);
    setFajl(null);
    setValaszto((szam) => szam + 1);
    await frissit();
  }

  return (
    <Keret>
      <div className="tanar-lap">
        <nav className="tanar-menu" aria-label="Tanári menü">
          {menuk.map((pont) => (
            <button
              key={pont.id}
              type="button"
              aria-current={menu === pont.id ? "page" : undefined}
              onClick={() => setMenu(pont.id)}
            >
              {pont.cim}
            </button>
          ))}
        </nav>
        <div className="lap belepes-lap tanar-tartalom">
        {menu === "felhasznalok" ? (
          <nav className="felso-menu" aria-label="Felhasználók">
            {reszek.map((alpont) => (
              <button
                key={alpont.id}
                type="button"
                aria-current={resz === alpont.id ? "page" : undefined}
                onClick={() => setResz(alpont.id)}
              >
                {alpont.cim}
              </button>
            ))}
          </nav>
        ) : null}
        {menu === "felhasznalok" && en ? (
          <Felhasznalok
            resz={resz}
            enId={en.id}
            szuperadmin={en.szuperadmin}
            nev={en.nev}
            email={en.email}
            onSajat={(adat) => {
              setEn({ ...en, ...adat });
              window.dispatchEvent(new Event("munkamenet"));
            }}
          />
        ) : null}
        {menu === "alkatreszek" ? <h2>Alkatrészek kezelése</h2> : null}
        {menu === "import" ? (
          <>
        <h2>Export/import</h2>
        <p>{en ? `${en.nev} van bejelentkezve.` : "Belépés…"}</p>
        {alkatreszek != null ? <p>{alkatreszek} alkatrész van a nyilvántartásban.</p> : null}
        <form className="urlap" onSubmit={feltolt}>
          <label>
            Excel-fájl
            <input
              key={valaszto}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(esemeny) => setFajl(esemeny.target.files?.[0] ?? null)}
            />
          </label>
          <p className="panel-allapot">
            A táblázat a minta szerinti legyen. A feltöltés a meglévő rekeszeket nem módosítja.
          </p>
          {hiba ? <p className="panel-allapot hiba">{hiba}</p> : null}
          {uzenet ? <p className="panel-allapot">{uzenet}</p> : null}
          <button type="submit" disabled={tolt}>
            {tolt ? "Feltöltés…" : "Feltöltés"}
          </button>
        </form>
          </>
        ) : null}
        </div>
      </div>
    </Keret>
  );
}
