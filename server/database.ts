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
        "rozsahRevize" TEXT,
        "predmetNeni" TEXT,
        "napetovaSoustava" TEXT,
        "ochranaOpatreni" TEXT,
        "kategorieRevize" TEXT DEFAULT 'elektro',
        podklady TEXT,
        "vyhodnoceniPredchozich" TEXT,
        "pouzitePristroje" TEXT,
        "provedeneUkony" TEXT,
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
        "izolacniOdpor" REAL,
        "impedanceSmycky" REAL,
        "proudovyChranicMa" REAL,
        "casOdpojeni" REAL,
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
        "pristrojId" INTEGER NOT NULL REFERENCES "mericiPristroj"(id)
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
        "kontaktEmail" TEXT,
        "kontaktTelefon" TEXT,
        logo TEXT,
        "createdAt" TEXT NOT NULL,
        "updatedAt" TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sablona (
        id SERIAL PRIMARY KEY,
        nazev TEXT NOT NULL,
        popis TEXT,
        "jeVychozi" INTEGER DEFAULT 0,
        "zahlaviZobrazitLogo" INTEGER DEFAULT 1,
        "zahlaviZobrazitFirmu" INTEGER DEFAULT 1,
        "zahlaviZobrazitTechnika" INTEGER DEFAULT 1,
        "zahlaviCustomText" TEXT,
        "barvaPrimary" TEXT,
        "barvaSecondary" TEXT,
        "fontFamily" TEXT,
        "fontSize" INTEGER,
        sekce TEXT,
        "sloupceOkruhu" TEXT,
        "uvodniStranaZobrazit" INTEGER DEFAULT 1,
        "uvodniStranaZobrazitFirmu" INTEGER DEFAULT 1,
        "uvodniStranaZobrazitTechnika" INTEGER DEFAULT 1,
        "uvodniStranaZobrazitObjekt" INTEGER DEFAULT 1,
        "uvodniStranaZobrazitZakaznika" INTEGER DEFAULT 1,
        "uvodniStranaZobrazitVyhodnoceni" INTEGER DEFAULT 1,
        "uvodniStranaZobrazitPodpisy" INTEGER DEFAULT 1,
        "podpisyUmisteni" TEXT DEFAULT 'uvodni',
        "uvodniStranaNadpis" TEXT,
        "uvodniStranaNadpisFontSize" INTEGER,
        "uvodniStranaNadpisRamecek" INTEGER DEFAULT 1,
        "uvodniStranaRamecekUdaje" INTEGER DEFAULT 1,
        "uvodniStranaRamecekObjekt" INTEGER DEFAULT 1,
        "uvodniStranaRamecekZakaznik" INTEGER DEFAULT 1,
        "uvodniStranaRamecekVyhodnoceni" INTEGER DEFAULT 1,
        "zapatiZobrazitCisloStranky" INTEGER DEFAULT 1,
        "zapatiZobrazitDatum" INTEGER DEFAULT 1,
        "zapatiCustomText" TEXT,
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
      // Umístění podpisů v šabloně
      'ALTER TABLE sablona ADD COLUMN IF NOT EXISTS "podpisyUmisteni" TEXT DEFAULT \'uvodni\'',
      // Bloky úvodní strany pro drag-and-drop editor
      'ALTER TABLE sablona ADD COLUMN IF NOT EXISTS "uvodniStranaBloky" TEXT',
      // Zobrazení zákazníka na úvodní straně
      'ALTER TABLE sablona ADD COLUMN IF NOT EXISTS "uvodniStranaZobrazitZakaznika" INTEGER DEFAULT 1',
      // Rámeček kolem údajů o zákazníkovi
      'ALTER TABLE sablona ADD COLUMN IF NOT EXISTS "uvodniStranaRamecekZakaznik" INTEGER DEFAULT 1',
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

    // Aktualizovat existující šablony - přidat nové sekce pokud chybí
    try {
      const sablonyResult = await client.query('SELECT id, sekce FROM sablona');
      const noveSekce = [
        { id: 'rozsah-podklady', nazev: 'Rozsah revize a podklady', enabled: true },
        { id: 'provedene-ukony', nazev: 'Provedené úkony', enabled: true },
        { id: 'vyhodnoceni-predchozich', nazev: 'Vyhodnocení předchozích revizí', enabled: true },
        { id: 'pristroje', nazev: 'Použité měřicí přístroje', enabled: true },
      ];

      for (const row of sablonyResult.rows) {
        if (!row.sekce) continue;
        
        let sekce = JSON.parse(row.sekce);
        let updated = false;
        
        // Zkontrolovat, zda sekce obsahuje nové položky
        for (const novaSekce of noveSekce) {
          if (!sekce.find((s: any) => s.id === novaSekce.id)) {
            // Najít správné pořadí pro vložení
            let poradi = sekce.length + 1;
            
            if (novaSekce.id === 'rozsah-podklady') {
              // Vložit za 'objekt'
              const objektIndex = sekce.findIndex((s: any) => s.id === 'objekt');
              if (objektIndex >= 0) {
                poradi = sekce[objektIndex].poradi + 1;
                // Posunout pořadí všech následujících sekcí
                sekce = sekce.map((s: any) => s.poradi > sekce[objektIndex].poradi ? { ...s, poradi: s.poradi + 1 } : s);
              }
            } else if (novaSekce.id === 'provedene-ukony') {
              const rozsahIndex = sekce.findIndex((s: any) => s.id === 'rozsah-podklady');
              if (rozsahIndex >= 0) {
                poradi = sekce[rozsahIndex].poradi + 1;
                sekce = sekce.map((s: any) => s.poradi > sekce[rozsahIndex].poradi ? { ...s, poradi: s.poradi + 1 } : s);
              }
            } else if (novaSekce.id === 'vyhodnoceni-predchozich') {
              const ukonyIndex = sekce.findIndex((s: any) => s.id === 'provedene-ukony');
              if (ukonyIndex >= 0) {
                poradi = sekce[ukonyIndex].poradi + 1;
                sekce = sekce.map((s: any) => s.poradi > sekce[ukonyIndex].poradi ? { ...s, poradi: s.poradi + 1 } : s);
              }
            } else if (novaSekce.id === 'pristroje') {
              // Vložit před 'zaver'
              const zaverIndex = sekce.findIndex((s: any) => s.id === 'zaver');
              if (zaverIndex >= 0) {
                poradi = sekce[zaverIndex].poradi;
                sekce = sekce.map((s: any) => s.poradi >= sekce[zaverIndex].poradi ? { ...s, poradi: s.poradi + 1 } : s);
              }
            }
            
            sekce.push({ ...novaSekce, poradi });
            updated = true;
          }
        }
        
        if (updated) {
          // Seřadit podle pořadí
          sekce.sort((a: any, b: any) => a.poradi - b.poradi);
          await client.query('UPDATE sablona SET sekce = $1 WHERE id = $2', [JSON.stringify(sekce), row.id]);
          console.log('✅ Šablona ID', row.id, 'aktualizována - přidány nové sekce');
        }
      }
    } catch (e: any) {
      console.log('⚠️ Aktualizace šablon přeskočena:', e.message);
    }

    // Aktualizovat existující šablony - přidat blok 'zakaznik' do úvodní strany
    try {
      const sablonyResult = await client.query('SELECT id, "uvodniStranaBloky" FROM sablona');
      
      for (const row of sablonyResult.rows) {
        let bloky = row.uvodniStranaBloky;
        if (!bloky || !Array.isArray(bloky)) {
          // Pokud není, nastavit defaultní bloky
          bloky = [
            { id: 'hlavicka', nazev: 'Hlavička (Firma + Revizní technik)', enabled: true, poradi: 1 },
            { id: 'nadpis', nazev: 'Nadpis dokumentu', enabled: true, poradi: 2 },
            { id: 'zakaznik', nazev: 'Provozovatel (zákazník)', enabled: true, poradi: 3 },
            { id: 'objekt', nazev: 'Identifikace zařízení a místo', enabled: true, poradi: 4 },
            { id: 'zakladni-udaje', nazev: 'Základní údaje revize', enabled: true, poradi: 5 },
            { id: 'vyhodnoceni', nazev: 'Vyhodnocení revize', enabled: true, poradi: 6 },
            { id: 'podpisy', nazev: 'Podpisy a předání', enabled: true, poradi: 7 },
          ];
          await client.query('UPDATE sablona SET "uvodniStranaBloky" = $1 WHERE id = $2', [JSON.stringify(bloky), row.id]);
          console.log('✅ Šablona ID', row.id, 'aktualizována - nastaveny defaultní bloky úvodní strany');
        } else {
          // Zkontrolovat zda existuje blok 'zakaznik'
          const hasZakaznik = bloky.find((b: any) => b.id === 'zakaznik');
          if (!hasZakaznik) {
            // Najít blok 'objekt' a vložit před něj
            const objektIndex = bloky.findIndex((b: any) => b.id === 'objekt');
            if (objektIndex >= 0) {
              // Posunout pořadí všech bloků od 'objekt' dále
              bloky = bloky.map((b: any) => b.poradi >= bloky[objektIndex].poradi ? { ...b, poradi: b.poradi + 1 } : b);
              // Vložit blok 'zakaznik'
              bloky.push({ id: 'zakaznik', nazev: 'Provozovatel (zákazník)', enabled: true, poradi: bloky[objektIndex].poradi - 1 });
            } else {
              // Pokud není 'objekt', vložit na pozici 3
              bloky.push({ id: 'zakaznik', nazev: 'Provozovatel (zákazník)', enabled: true, poradi: 3 });
            }
            bloky.sort((a: any, b: any) => a.poradi - b.poradi);
            await client.query('UPDATE sablona SET "uvodniStranaBloky" = $1 WHERE id = $2', [JSON.stringify(bloky), row.id]);
            console.log('✅ Šablona ID', row.id, 'aktualizována - přidán blok zakaznik');
          }
        }
      }
    } catch (e: any) {
      console.log('⚠️ Aktualizace bloků úvodní strany přeskočena:', e.message);
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
