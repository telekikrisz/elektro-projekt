# Elektro leltár

Elektronikai alkatrészkereső. A keresés bejelentkezés nélkül használható. A tanári felület (felhasználók, Excel-betöltés) belépéshez kötött.

## 1. Ezeket kell feltenni a gépre

Három program kell. A sorrend mindegy.

1. **Git**, a forrás letöltéséhez: [https://git-scm.com/download/win](https://git-scm.com/download/win). Telepítéskor az alapbeállítások jók.
2. **Node.js**, ez futtatja a programot. A 22-es vagy újabb kell, az npm vele jön: [https://nodejs.org](https://nodejs.org) (az LTS gomb). Telepítés után nyiss egy új parancssort, és ellenőrizd:

   ```
   node -v
   npm -v
   ```

   Mindkét parancsnak verziószámot kell kiírnia.

3. **Docker Desktop**, ez indítja az adatbázist. Külön PostgreSQL-t nem kell telepíteni. Letöltés: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/). Windowson a telepítő a WSL2-t is kéri, azt el kell fogadni. A telepítés után indítsd el a Docker Desktopot, és várd meg, amíg fut (a tálcán az ikonja nem pörög).

Macen ugyanez a három program kell, a Git gyakran már fent van. A parancsok utána ugyanazok.

## 2. Forrás letöltése

Parancssorban, egy olyan mappában, ahova a projekt kerülhet:

```
git clone https://github.com/telekikrisz/elektro-projekt.git
cd elektro-projekt
```

## 3. Első indítás

A projekt mappájában:

```
copy .env.example .env
```

Macen vagy Linuxon: `cp .env.example .env`

Ez a helyi adatbázis címét tartalmazza (`localhost:5432`, felhasználó és jelszó: `elektro`).

Indítsd az adatbázist, várd meg, amíg a konténer fut, majd hozd létre a táblákat és a mintaalkatrészeket:

```
docker compose up -d
npm install
npm run db:migrate
npm run minta
```

Ha a `db:migrate` azt írja, hogy nem éri el az adatbázist, a Docker Desktop még nem indult el, vagy az 5432-es porton már fut egy másik PostgreSQL. Állítsd le a másikat, és futtasd újra a migrációt.

A felület külön mappában van:

```
cd frontend
npm install
cd ..
```

## 4. Mindennapos indítás

Két parancssor kell, mindkettő a projekt mappájából. Ezeket hagyd nyitva.

Az elsőben az API:

```
npm run dev
```

Akkor kész, ha ezt látod: `API a 3000 porton`.

A másodikban a felület:

```
cd frontend
npm run dev
```

A böngészőben: [http://localhost:5173](http://localhost:5173)

## 5. Mit lehet megnézni

A nyitóoldal a kereső. Üres kereséssel az összes mintaalkatrész kijön. A Megtekintés az alkatrész adatait és a rekeszeit mutatja.

A tanári felület a jobb felső Belépés. A fejlesztői fiók:

- e-mail: `superadmin`
- jelszó: `superadmin`

Az első belépés után új jelszót kell megadni. Ez csak egyszer kell. A böngésző szólhat, hogy a `superadmin` jelszó ismert adatszivárgásokban szerepel. Ez a Google jelszóellenőrzése, nem a program hibája. A fejlesztői belépéshez egyelőre ez a jelszó van.

Belépés után az alkatrészek kezelése nyílik meg. A bal menü: Alkatrészek kezelése, Export/import, Felhasználók kezelése. Az Export/import Excel-fájlt tölt be, a rekeszeket nem módosítja.

## 6. Leállítás

A két parancssorban Ctrl+C. Az adatbázis leállítása a projekt mappájában:

```
docker compose stop
```

Az adatok megmaradnak. Következő alkalommal elég a `docker compose up -d`, majd a két `npm run dev`.
