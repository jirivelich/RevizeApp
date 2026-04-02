import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

// Použít DATABASE_URL z Railway
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL není nastavena! Přidejte PostgreSQL databázi v Railway.');
  process.exit(1);
}

console.log('📂 Připojuji se k PostgreSQL databázi...');

// Vytvořit pool pro PostgreSQL
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Export pool pro přímé použití v serveru
export { pool };
export default pool;

// Inicializovat schema
export async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // PostgreSQL vyžaduje jednotlivé CREATE TABLE příkazy
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        jmeno TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    // Tabulka zákazníků
    await client.query(`
      CREATE TABLE IF NOT EXISTS zakaznik (
        id SERIAL PRIMARY KEY,
        nazev TEXT NOT NULL,
        adresa TEXT,
        ico TEXT,
        dic TEXT,
        "kontaktOsoba" TEXT,
        telefon TEXT,
        email TEXT,
        poznamka TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS revize (
        id SERIAL PRIMARY KEY,
        "cisloRevize" TEXT UNIQUE NOT NULL,
        nazev TEXT NOT NULL,
        adresa TEXT NOT NULL,
        objednatel TEXT NOT NULL,
        "zakaznikId" INTEGER REFERENCES zakaznik(id),
        datum TEXT NOT NULL,
        "datumDokonceni" TEXT,
        "datumPlatnosti" TEXT,
        termin INTEGER DEFAULT 36,
        "datumVypracovani" TEXT,
        "typRevize" TEXT,
        "duvodMimoradne" TEXT,
        stav TEXT,
        poznamka TEXT,
        vysledek TEXT,
        "vysledekOduvodneni" TEXT,
        "popisZarizeni" TEXT,
        "rozsahRevize" TEXT,
        "predmetNeni" TEXT,
        "napetovaSoustava" TEXT,
        "ochranaOpatreni" TEXT,
        "kategorieRevize" TEXT DEFAULT 'elektro',
        podklady TEXT,
        "vyhodnoceniPredchozich" TEXT,
        "pouzitePristroje" TEXT,
        "provedeneUkony" TEXT,
        "tiskSekce" TEXT,
        zaver TEXT,
        "firmaJmeno" TEXT,
        "firmaAdresa" TEXT,
        "firmaIco" TEXT,
        "firmaDic" TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS rozvadec (
        id SERIAL PRIMARY KEY,
        "revizeId" INTEGER NOT NULL REFERENCES revize(id) ON DELETE CASCADE,
        nazev TEXT NOT NULL,
        oznaceni TEXT,
        umisteni TEXT,
        "typRozvadece" TEXT,
        "stupenKryti" TEXT,
        "proudovyChranicTyp" TEXT,
        poznamka TEXT,
        poradi INTEGER,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS okruh (
        id SERIAL PRIMARY KEY,
        "rozvadecId" INTEGER NOT NULL REFERENCES rozvadec(id) ON DELETE CASCADE,
        cislo INTEGER,
        nazev TEXT NOT NULL,
        "jisticTyp" TEXT,
        "jisticProud" TEXT,
        "pocetFazi" INTEGER,
        vodic TEXT,
        "izolacniOdpor" TEXT,
        "impedanceSmycky" TEXT,
        poznamka TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS chranic (
        id SERIAL PRIMARY KEY,
        "rozvadecId" INTEGER NOT NULL REFERENCES rozvadec(id) ON DELETE CASCADE,
        cislo INTEGER,
        nazev TEXT NOT NULL,
        typ TEXT,
        proud TEXT,
        "citlivostMa" REAL,
        "pocetPolu" INTEGER,
        "testovacitlacitko" BOOLEAN,
        nevybavovaci BOOLEAN,
        "dotykoveNapeti" REAL,
        "vybavovacProud" REAL,
        "casOdpojeni1x" REAL,
        "casOdpojeni5x" REAL,
        "casOdpojeni1_4x" REAL,
        "casOdpojeni2x" REAL,
        "zkouskaVypnuti2x" BOOLEAN,
        selektivita BOOLEAN,
        poznamka TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS mistnost (
        id SERIAL PRIMARY KEY,
        "revizeId" INTEGER NOT NULL REFERENCES revize(id) ON DELETE CASCADE,
        nazev TEXT NOT NULL,
        patro TEXT,
        plocha REAL,
        typ TEXT,
        prostredi TEXT,
        poznamka TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS zarizeni (
        id SERIAL PRIMARY KEY,
        "mistnostId" INTEGER NOT NULL REFERENCES mistnost(id) ON DELETE CASCADE,
        nazev TEXT NOT NULL,
        oznaceni TEXT,
        "pocetKs" INTEGER,
        trida TEXT,
        "prikonW" INTEGER,
        "ochranaPredDotykem" TEXT,
        stav TEXT,
        poznamka TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS zavada (
        id SERIAL PRIMARY KEY,
        "revizeId" INTEGER NOT NULL REFERENCES revize(id) ON DELETE CASCADE,
        "rozvadecId" INTEGER REFERENCES rozvadec(id),
        "mistnostId" INTEGER REFERENCES mistnost(id),
        popis TEXT NOT NULL,
        zavaznost TEXT,
        stav TEXT,
        fotky TEXT,
        "datumZjisteni" TEXT,
        "datumVyreseni" TEXT,
        poznamka TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS zakazka (
        id SERIAL PRIMARY KEY,
        nazev TEXT NOT NULL,
        klient TEXT,
        adresa TEXT,
        "datumPlanovany" TEXT,
        "casPlanovany" TEXT,
        "datumDokonceni" TEXT,
        stav TEXT,
        priorita TEXT,
        "revizeId" INTEGER REFERENCES revize(id),
        poznamka TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "mericiPristroj" (
        id SERIAL PRIMARY KEY,
        nazev TEXT NOT NULL,
        vyrobce TEXT,
        model TEXT,
        "vyrobniCislo" TEXT,
        "typPristroje" TEXT,
        "datumKalibrace" TEXT,
        "platnostKalibrace" TEXT,
        "kalibracniList" TEXT,
        poznamka TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "revizePristroj" (
        id SERIAL PRIMARY KEY,
        "revizeId" INTEGER NOT NULL REFERENCES revize(id) ON DELETE CASCADE,
        "pristrojId" INTEGER NOT NULL REFERENCES "mericiPristroj"(id) ON DELETE CASCADE
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS kalibrace (
        id SERIAL PRIMARY KEY,
        "pristrojId" INTEGER NOT NULL REFERENCES "mericiPristroj"(id) ON DELETE CASCADE,
        "datumKalibrace" TEXT NOT NULL,
        "platnostKalibrace" TEXT NOT NULL,
        "kalibracniList" TEXT,
        provedl TEXT,
        certifikat TEXT,
        poznamka TEXT,
        "createdAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS firma (
        id SERIAL PRIMARY KEY,
        nazev TEXT NOT NULL,
        adresa TEXT,
        ico TEXT UNIQUE,
        dic TEXT,
        "kontaktOsoba" TEXT,
        telefon TEXT,
        email TEXT,
        poznamka TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS nastaveni (
        id SERIAL PRIMARY KEY,
        "firmaJmeno" TEXT,
        "firmaAdresa" TEXT,
        "firmaIco" TEXT,
        "firmaDic" TEXT,
        "reviznniTechnikJmeno" TEXT,
        "reviznniTechnikCisloOpravneni" TEXT,
        "reviznniTechnikOsvedceni" TEXT,
        "reviznniTechnikAdresa" TEXT,
        "reviznniTechnikIco" TEXT,
        "kontaktEmail" TEXT,
        "kontaktTelefon" TEXT,
        logo TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "zavadaKatalog" (
        id SERIAL PRIMARY KEY,
        popis TEXT NOT NULL,
        zavaznost TEXT,
        norma TEXT,
        clanek TEXT,
        "zneniClanku" TEXT,
        kategorie TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "predvolenyText" (
        id SERIAL PRIMARY KEY,
        pole TEXT NOT NULL,
        nazev TEXT NOT NULL,
        text TEXT NOT NULL,
        poradi INTEGER DEFAULT 0,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    // Vytvořit indexy (ignorovat chyby pokud existují)
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_revize_cislo ON revize("cisloRevize")',
      'CREATE INDEX IF NOT EXISTS idx_revize_datum ON revize(datum)',
      'CREATE INDEX IF NOT EXISTS idx_rozvadec_revize ON rozvadec("revizeId")',
      'CREATE INDEX IF NOT EXISTS idx_okruh_rozvadec ON okruh("rozvadecId")',
      'CREATE INDEX IF NOT EXISTS idx_mistnost_revize ON mistnost("revizeId")',
      'CREATE INDEX IF NOT EXISTS idx_zarizeni_mistnost ON zarizeni("mistnostId")',
      'CREATE INDEX IF NOT EXISTS idx_zavada_revize ON zavada("revizeId")',
      'CREATE INDEX IF NOT EXISTS idx_zavada_stav ON zavada(stav)',
    ];
    
    for (const idx of indexes) {
      try {
        await client.query(idx);
      } catch (e) {
        // Index možná už existuje
      }
    }

    // Migrace - přidat chybějící sloupce do existujících tabulek
    const migrations = [
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "zakaznikId" INTEGER REFERENCES zakaznik(id)',
      // Odstranit UNIQUE constraint z vyrobniCislo (může být prázdné nebo duplicitní)
      'ALTER TABLE "mericiPristroj" DROP CONSTRAINT IF EXISTS "mericiPristroj_vyrobniCislo_key"',
      // Přidat kategorii revize (elektro, hromosvod, stroje)
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "kategorieRevize" TEXT DEFAULT \'elektro\'',
      // Nová pole pro revidované zařízení
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "predmetNeni" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "napetovaSoustava" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "ochranaOpatreni" TEXT',
      // Nová pole pro revizního technika - adresa, IČO a osvědčení
      'ALTER TABLE nastaveni ADD COLUMN IF NOT EXISTS "reviznniTechnikAdresa" TEXT',
      'ALTER TABLE nastaveni ADD COLUMN IF NOT EXISTS "reviznniTechnikIco" TEXT',
      'ALTER TABLE nastaveni ADD COLUMN IF NOT EXISTS "reviznniTechnikOsvedceni" TEXT',
      // Plánovaný čas zakázky
      'ALTER TABLE zakazka ADD COLUMN IF NOT EXISTS "casPlanovany" TEXT',
      // Opravit FK na mericiPristroj - přidat ON DELETE CASCADE
      'ALTER TABLE "revizePristroj" DROP CONSTRAINT IF EXISTS "revizePristroj_pristrojId_fkey"',
      'ALTER TABLE "revizePristroj" ADD CONSTRAINT "revizePristroj_pristrojId_fkey" FOREIGN KEY ("pristrojId") REFERENCES "mericiPristroj"(id) ON DELETE CASCADE',
      // Popis zařízení
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "popisZarizeni" TEXT',
      // Nastavení viditelných sekcí pro tisk
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "tiskSekce" TEXT',
      // === Hromosvod (LPS) sloupce ===
      // Charakteristika LPS
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodTridaLps" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodTypOchrany" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodRokInstalace" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodNorma" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodPopisLps" TEXT',
      // Jímací soustava
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodJimaciTyp" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodJimaciMaterial" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodJimaciStav" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodJimaciPoznamka" TEXT',
      // Svodové vedení
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSvodyPocet" INTEGER',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSvodyMaterial" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSvodyPrurez" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSvodyZkusebniSvorky" INTEGER',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSvodyStav" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSvodyPoznamka" TEXT',
      // Uzemňovací soustava
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodUzemneniTyp" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodUzemneniMaterial" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodUzemneniStav" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodUzemneniPoznamka" TEXT',
      // SPD / Ochranné pospojování
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSpdTyp" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSpdStav" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodEkvipotencialni" TEXT',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodSpdPoznamka" TEXT',
      // Měření odporů uzemnění (JSON pole)
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "hromosvodMereniOdporu" TEXT',
      // === Strojní zařízení ===
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "strojniData" TEXT',
      // Normy soulad – text nad nadpisem zprávy
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "normySoulad" TEXT',
      // Lhůta – vlastní text místo počtu měsíců
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "lhutaText" TEXT',
      // Snapshot kalibrací v revizePristroj – při změně kalibrace na přístroji zůstane v revizi původní
      'ALTER TABLE "revizePristroj" ADD COLUMN IF NOT EXISTS "datumKalibrace" TEXT',
      'ALTER TABLE "revizePristroj" ADD COLUMN IF NOT EXISTS "platnostKalibrace" TEXT',
      // === Historie / návaznost revizí ===
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "predchoziRevizeId" INTEGER REFERENCES revize(id) ON DELETE SET NULL',
      'ALTER TABLE revize ADD COLUMN IF NOT EXISTS "skupinaRevizi" TEXT',
      // Fix: zakazka.revizeId musí mít ON DELETE SET NULL
      `DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'zakazka_revizeId_fkey' AND table_name = 'zakazka') THEN
          ALTER TABLE zakazka DROP CONSTRAINT "zakazka_revizeId_fkey";
          ALTER TABLE zakazka ADD CONSTRAINT "zakazka_revizeId_fkey" FOREIGN KEY ("revizeId") REFERENCES revize(id) ON DELETE SET NULL;
        END IF;
      END $$`,
      // Okruh: izolacniOdpor a impedanceSmycky z REAL na TEXT
      'ALTER TABLE okruh ALTER COLUMN "izolacniOdpor" TYPE TEXT USING "izolacniOdpor"::TEXT',
      'ALTER TABLE okruh ALTER COLUMN "impedanceSmycky" TYPE TEXT USING "impedanceSmycky"::TEXT',
      // Rozvadec: přidání sloupce poradi
      'ALTER TABLE rozvadec ADD COLUMN IF NOT EXISTS poradi INTEGER',
      // Chranic: odstrání sloupce chranice z okruhu (přesun do samostatné entity)
      'ALTER TABLE okruh DROP COLUMN IF EXISTS "proudovyChranicMa"',
      'ALTER TABLE okruh DROP COLUMN IF EXISTS "casOdpojeni"',
      // Chranic: renám a rozšíření měřených hodnot
      'ALTER TABLE chranic RENAME COLUMN "casOdpojeni" TO "casOdpojeni1x"',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS "testovacitlacitko" BOOLEAN',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS nevybavovaci BOOLEAN',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS "dotykoveNapeti" REAL',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS "vybavovacProud" REAL',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS "casOdpojeni5x" REAL',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS "casOdpojeni1_4x" REAL',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS "casOdpojeni2x" REAL',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS "zkouskaVypnuti2x" BOOLEAN',
      'ALTER TABLE chranic ADD COLUMN IF NOT EXISTS selektivita BOOLEAN',
    ];
    
    for (const migration of migrations) {
      try {
        await client.query(migration);
        console.log('✅ Migrace provedena:', migration.substring(0, 60) + '...');
      } catch (e: any) {
        // Sloupec možná už existuje nebo jiná chyba
        if (!e.message?.includes('already exists')) {
          console.log('⚠️ Migrace přeskočena:', e.message);
        }
      }
    }

    // Jednorázová migrace: doplnit snapshot kalibrace pro existující vazby, které ještě nemají snapshot
    try {
      await client.query(`
        UPDATE "revizePristroj" rp
        SET "datumKalibrace" = mp."datumKalibrace",
            "platnostKalibrace" = mp."platnostKalibrace"
        FROM "mericiPristroj" mp
        WHERE rp."pristrojId" = mp.id
          AND rp."datumKalibrace" IS NULL
          AND rp."platnostKalibrace" IS NULL
      `);
      console.log('✅ Snapshot kalibrací doplněn pro existující vazby');
    } catch (e: any) {
      console.log('⚠️ Snapshot kalibrací nelze doplnit:', e.message);
    }

    // Vytvořit demo uživatele pokud neexistuje
    const existingUser = await client.query('SELECT id FROM users WHERE username = $1', ['admin']);
    if (existingUser.rows.length === 0) {
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      const now = new Date().toISOString();
      await client.query(`
        INSERT INTO users (username, password, email, jmeno, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, ['admin', hashedPassword, 'admin@revizeapp.cz', 'Administrátor', now, now]);
      
      console.log('✅ Demo uživatel vytvořen: admin / admin123');
    }
    
    console.log('✅ PostgreSQL databáze inicializována');
  } finally {
    client.release();
  }
}
