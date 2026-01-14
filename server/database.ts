import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'data', 'revizeapp.db');

// Vytvořit data adresář pokud neexistuje
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Vytvořit databázi
const db = new Database(dbPath);

// Povolit foreign keys
db.pragma('foreign_keys = ON');

export default db as any;

// Inicializovat schema
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      jmeno TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revize (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cisloRevize TEXT UNIQUE NOT NULL,
      nazev TEXT NOT NULL,
      adresa TEXT NOT NULL,
      objednatel TEXT NOT NULL,
      datum TEXT NOT NULL,
      datumDokonceni TEXT,
      datumPlatnosti TEXT,
      termin INTEGER DEFAULT 36,
      datumVypracovani TEXT,
      typRevize TEXT CHECK(typRevize IN ('pravidelná', 'výchozí', 'mimořádná')),
      duvodMimoradne TEXT,
      stav TEXT CHECK(stav IN ('rozpracováno', 'dokončeno', 'schváleno')),
      poznamka TEXT,
      vysledek TEXT CHECK(vysledek IN ('schopno', 'neschopno', 'podmíněně schopno')),
      vysledekOduvodneni TEXT,
      rozsahRevize TEXT,
      podklady TEXT,
      vyhodnoceniPredchozich TEXT,
      pouzitePristroje TEXT,
      provedeneUkony TEXT,
      zaver TEXT,
      firmaJmeno TEXT,
      firmaAdresa TEXT,
      firmaIco TEXT,
      firmaDic TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rozvadec (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revizeId INTEGER NOT NULL,
      nazev TEXT NOT NULL,
      oznaceni TEXT,
      umisteni TEXT,
      typRozvadece TEXT,
      stupenKryti TEXT,
      proudovyChranicTyp TEXT,
      poznamka TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (revizeId) REFERENCES revize(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS okruh (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rozvadecId INTEGER NOT NULL,
      cislo INTEGER,
      nazev TEXT NOT NULL,
      jisticTyp TEXT,
      jisticProud TEXT,
      pocetFazi INTEGER,
      vodic TEXT,
      izolacniOdpor REAL,
      impedanceSmycky REAL,
      proudovyChranicMa REAL,
      casOdpojeni REAL,
      poznamka TEXT,
      FOREIGN KEY (rozvadecId) REFERENCES rozvadec(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS mistnost (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revizeId INTEGER NOT NULL,
      nazev TEXT NOT NULL,
      patro TEXT,
      plocha REAL,
      typ TEXT,
      prostredi TEXT,
      poznamka TEXT,
      FOREIGN KEY (revizeId) REFERENCES revize(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS zarizeni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mistnostId INTEGER NOT NULL,
      nazev TEXT NOT NULL,
      oznaceni TEXT,
      pocetKs INTEGER,
      trida TEXT CHECK(trida IN ('I', 'II', 'III')),
      prikonW INTEGER,
      ochranaPredDotykem TEXT,
      stav TEXT CHECK(stav IN ('OK', 'závada', 'nekontrolováno')),
      poznamka TEXT,
      FOREIGN KEY (mistnostId) REFERENCES mistnost(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS zavada (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revizeId INTEGER NOT NULL,
      rozvadecId INTEGER,
      mistnostId INTEGER,
      popis TEXT NOT NULL,
      zavaznost TEXT CHECK(zavaznost IN ('C1', 'C2', 'C3')),
      stav TEXT CHECK(stav IN ('otevřená', 'v řešení', 'vyřešená')),
      fotky TEXT,
      datumZjisteni TEXT,
      datumVyreseni TEXT,
      poznamka TEXT,
      FOREIGN KEY (revizeId) REFERENCES revize(id) ON DELETE CASCADE,
      FOREIGN KEY (rozvadecId) REFERENCES rozvadec(id),
      FOREIGN KEY (mistnostId) REFERENCES mistnost(id)
    );

    CREATE TABLE IF NOT EXISTS zakazka (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazev TEXT NOT NULL,
      klient TEXT,
      adresa TEXT,
      datumPlanovany TEXT,
      datumDokonceni TEXT,
      stav TEXT CHECK(stav IN ('plánováno', 'v realizaci', 'dokončeno', 'zrušeno')),
      priorita TEXT CHECK(priorita IN ('nízká', 'střední', 'vysoká')),
      revizeId INTEGER,
      poznamka TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (revizeId) REFERENCES revize(id)
    );

    CREATE TABLE IF NOT EXISTS mericiPristroj (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazev TEXT NOT NULL,
      vyrobce TEXT,
      model TEXT,
      vyrobniCislo TEXT UNIQUE,
      typPristroje TEXT,
      datumKalibrace TEXT,
      platnostKalibrace TEXT,
      kalibracniList TEXT,
      poznamka TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS revizePristroj (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revizeId INTEGER NOT NULL,
      pristrojId INTEGER NOT NULL,
      FOREIGN KEY (revizeId) REFERENCES revize(id) ON DELETE CASCADE,
      FOREIGN KEY (pristrojId) REFERENCES mericiPristroj(id)
    );

    CREATE TABLE IF NOT EXISTS firma (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazev TEXT NOT NULL,
      adresa TEXT,
      ico TEXT UNIQUE,
      dic TEXT,
      kontaktOsoba TEXT,
      telefon TEXT,
      email TEXT,
      poznamka TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS nastaveni (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firmaJmeno TEXT,
      firmaAdresa TEXT,
      firmaIco TEXT,
      firmaDic TEXT,
      reviznniTechnikJmeno TEXT,
      reviznniTechnikCisloOpravneni TEXT,
      kontaktEmail TEXT,
      kontaktTelefon TEXT,
      logo LONGTEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sablona (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nazev TEXT NOT NULL,
      jeVychozi INTEGER DEFAULT 0,
      barvaPrimary TEXT,
      barvaSecondary TEXT,
      fontFamily TEXT,
      fontSize INTEGER,
      sekce TEXT,
      sloupceOkruhu TEXT,
      uvodniStranaZobrazit INTEGER DEFAULT 1,
      uvodniStranaZobrazitFirmu INTEGER DEFAULT 1,
      uvodniStranaZobrazitTechnika INTEGER DEFAULT 1,
      uvodniStranaZobrazitObjekt INTEGER DEFAULT 1,
      uvodniStranaZobrazitVyhodnoceni INTEGER DEFAULT 1,
      uvodniStranaZobrazitPodpisy INTEGER DEFAULT 1,
      uvodniStranaNadpis TEXT,
      uvodniStranaNadpisFontSize INTEGER,
      uvodniStranaNadpisRamecek INTEGER DEFAULT 1,
      uvodniStranaRamecekUdaje INTEGER DEFAULT 1,
      uvodniStranaRamecekObjekt INTEGER DEFAULT 1,
      uvodniStranaRamecekVyhodnoceni INTEGER DEFAULT 1,
      zapatiCustomText TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS zavadaKatalog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      popis TEXT NOT NULL,
      zavaznost TEXT CHECK(zavaznost IN ('C1', 'C2', 'C3')),
      norma TEXT,
      clanek TEXT,
      zneniClanku TEXT,
      kategorie TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_revize_cislo ON revize(cisloRevize);
    CREATE INDEX IF NOT EXISTS idx_revize_datum ON revize(datum);
    CREATE INDEX IF NOT EXISTS idx_rozvadec_revize ON rozvadec(revizeId);
    CREATE INDEX IF NOT EXISTS idx_okruh_rozvadec ON okruh(rozvadecId);
    CREATE INDEX IF NOT EXISTS idx_mistnost_revize ON mistnost(revizeId);
    CREATE INDEX IF NOT EXISTS idx_zarizeni_mistnost ON zarizeni(mistnostId);
    CREATE INDEX IF NOT EXISTS idx_zavada_revize ON zavada(revizeId);
    CREATE INDEX IF NOT EXISTS idx_zavada_stav ON zavada(stav);
  `);

  // Vytvořit demo uživatele pokud neexistuje
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!existingUser) {
    // Hashovat heslo synchronně pomocí bcryptjs
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO users (username, password, email, jmeno, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', hashedPassword, 'admin@revizeapp.cz', 'Administrátor', now, now);
    
    console.log('✅ Demo uživatel vytvořen: admin / admin123');
  }

  console.log('✅ Databáze inicializována:', dbPath);
}
