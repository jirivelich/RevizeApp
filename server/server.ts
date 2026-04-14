import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { pool, initializeDatabase } from './database';
import { authMiddleware, loginUser, registerUser, logoutSession, AuthRequest } from './auth';
import { isAIConfigured, generateReport, chatWithAssistant, getAutofillSuggestion, analyzeRozvadecPhotos } from './ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGINS = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

// Middleware
app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true,
  optionsSuccessStatus: 200
}));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Servírovat statické soubory frontendu (dist/)
const possibleDistPaths = [
  path.join(__dirname, '..', 'dist'),
  path.join(process.cwd(), 'dist'),
  '/app/dist'
];

let distPath = '';
for (const p of possibleDistPaths) {
  if (fs.existsSync(p)) {
    distPath = p;
    console.log(`📁 Statické soubory: ${distPath}`);
    break;
  }
}

if (distPath) {
  app.use(express.static(distPath));
}

// Inicializovat databázi
async function startServer() {
  try {
    await initializeDatabase();
    console.log('✅ PostgreSQL databáze inicializována');
  } catch (error) {
    console.error('❌ Chyba při inicializaci databáze:', error);
    process.exit(1);
  }

  // ==================== HEALTH CHECK ====================
  app.get('/api/health', async (req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  });

  // ==================== AUTH ====================
  app.post('/api/auth/login', async (req, res) => {
    try {
      const result = await loginUser(req.body.username, req.body.password);
      res.json(result);
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  });

  app.post('/api/auth/register', authMiddleware, async (req, res) => {
    try {
      const result = await registerUser(req.body);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/auth/me', authMiddleware, (req: AuthRequest, res) => {
    res.json({ user: req.user });
  });

  // Verify token endpoint
  app.post('/api/auth/verify', authMiddleware, (req: AuthRequest, res) => {
    res.json({ valid: true, user: req.user });
  });

  // Logout endpoint
  app.post('/api/auth/logout', authMiddleware, async (req: AuthRequest, res) => {
    try {
      await logoutSession(req.sessionId!);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== REVIZE ====================
  app.get('/api/revize', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM revize ORDER BY datum DESC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/revize/:id', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM revize WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Revize nebyla nalezena' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/revize', authMiddleware, async (req, res) => {
    try {
      const { cisloRevize, nazev, adresa, objednatel, datum, termin, typRevize, stav, kategorieRevize } = req.body;
      const now = new Date().toISOString();

      // Načíst nejnovější doklad technika pro snapshot
      const histRow = await pool.query('SELECT * FROM "technikHistorie" ORDER BY "createdAt" DESC LIMIT 1');
      const h = histRow.rows[0] || {};
      // Fallback na nastaveni pokud ještě nejsou záznamy v historii
      const nastaveniRow = await pool.query('SELECT * FROM nastaveni LIMIT 1');
      const n = nastaveniRow.rows[0] || {};

      const result = await pool.query(`
        INSERT INTO revize ("cisloRevize", nazev, adresa, objednatel, datum, termin, "typRevize", stav, "kategorieRevize",
          "rtJmeno", "rtCisloOpravneni", "rtPlatnostOpravneni", "rtCisloOsvedceni", "rtPlatnostOsvedceni",
          "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        cisloRevize, nazev, adresa, objednatel, datum, termin, typRevize, stav, kategorieRevize || 'elektro',
        h.reviznniTechnikJmeno || n.reviznniTechnikJmeno || null,
        h.reviznniTechnikCisloOpravneni || n.reviznniTechnikCisloOpravneni || null,
        h.reviznniTechnikPlatnostOpravneni || n.reviznniTechnikPlatnostOpravneni || null,
        h.reviznniTechnikOsvedceni || n.reviznniTechnikOsvedceni || null,
        h.reviznniTechnikPlatnostOsvedceni || n.reviznniTechnikPlatnostOsvedceni || null,
        now, now,
      ]);

      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/revize/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      
      // Definovat povolené sloupce pro revize
      const allowedColumns = [
        'cisloRevize', 'nazev', 'adresa', 'objednatel', 'zakaznikId',
        'datum', 'datumDokonceni', 'datumPlatnosti', 'termin', 'datumVypracovani',
        'typRevize', 'duvodMimoradne', 'stav', 'poznamka', 'vysledek',
        'vysledekOduvodneni', 'rozsahRevize', 'predmetNeni', 'napetovaSoustava',
        'ochranaOpatreni', 'podklady', 'vyhodnoceniPredchozich',
        'pouzitePristroje', 'provedeneUkony', 'firmaJmeno', 'firmaAdresa',
        'firmaIco', 'firmaDic', 'zaver', 'kategorieRevize', 'updatedAt',
        'tiskSekce', 'popisZarizeni',
        // Hromosvod (LPS) sloupce
        'hromosvodTridaLps', 'hromosvodTypOchrany', 'hromosvodRokInstalace',
        'hromosvodNorma', 'hromosvodPopisLps',
        'hromosvodJimaciTyp', 'hromosvodJimaciMaterial', 'hromosvodJimaciStav',
        'hromosvodJimaciPoznamka',
        'hromosvodSvodyPocet', 'hromosvodSvodyMaterial', 'hromosvodSvodyPrurez',
        'hromosvodSvodyZkusebniSvorky', 'hromosvodSvodyStav', 'hromosvodSvodyPoznamka',
        'hromosvodUzemneniTyp', 'hromosvodUzemneniMaterial', 'hromosvodUzemneniStav',
        'hromosvodUzemneniPoznamka',
        'hromosvodSpdTyp', 'hromosvodSpdStav', 'hromosvodEkvipotencialni',
        'hromosvodSpdPoznamka',
        'hromosvodMereniOdporu',
        // Strojní zařízení (JSON)
        'strojniData',
        // Normy soulad + vlastní text lhůty
        'normySoulad', 'lhutaText',
        // Historie / návaznost revizí
        'predchoziRevizeId', 'skupinaRevizi',
        // Snapshot revizního technika
        'rtJmeno', 'rtCisloOpravneni', 'rtPlatnostOpravneni', 'rtCisloOsvedceni', 'rtPlatnostOsvedceni',
        // Rozdělovník – seznam příjemců zprávy
        'rozdelovnik',
        // Náčrt LPS – base64 PNG
        'hromosvodNacrt',
      ];
      
      const updates: Record<string, any> = { updatedAt: now };
      for (const key of Object.keys(req.body)) {
        if (allowedColumns.includes(key)) {
          updates[key] = req.body[key];
        }
      }
      
      // DEBUG – logovat lhutaText
      console.log('[PUT revize] lhutaText in body:', JSON.stringify(req.body.lhutaText), '| in updates:', JSON.stringify(updates.lhutaText));
      
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE revize SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating revize:', error);
      // Pokud sloupec neexistuje, zkusit bez zakaznikId
      if (error.message?.includes('zakaznikId') && error.message?.includes('does not exist')) {
        try {
          const now = new Date().toISOString();
          const { zakaznikId, ...restBody } = req.body;
          const updates = { ...restBody, updatedAt: now };
          const keys = Object.keys(updates);
          const values = Object.values(updates);
          
          const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
          await pool.query(`UPDATE revize SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
          
          return res.json({ success: true });
        } catch (retryError) {
          return res.status(500).json({ error: (retryError as Error).message });
        }
      }
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/revize/:id', authMiddleware, async (req, res) => {
    try {
      const id = req.params.id;
      // Odpojit zakázky navázané na tuto revizi
      await pool.query('UPDATE zakazka SET "revizeId" = NULL WHERE "revizeId" = $1', [id]);
      // Odpojit navazující revize (predchoziRevizeId)
      await pool.query('UPDATE revize SET "predchoziRevizeId" = NULL WHERE "predchoziRevizeId" = $1', [id]);
      // Smazat revizi (kaskádně smaže rozvadeče, místnosti, závady, přístroje)
      await pool.query('DELETE FROM revize WHERE id = $1', [id]);
      res.json({ success: true });
    } catch (error) {
      console.error('Chyba při mazání revize:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== DUPLIKOVAT REVIZI (pro následnou revizi) ====================
  app.post('/api/revize/:id/duplikovat', authMiddleware, async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sourceId = parseInt(req.params.id);
      const { cisloRevize: noveCislo, typ = 'navazujici' } = req.body;
      // typ: 'navazujici' = navazující revize s historií, 'duplikat' = nezávislá kopie

      console.log(`📋 Duplikace revize ID=${sourceId}, nové číslo=${noveCislo}, typ=${typ}`);

      // 1. Načíst zdrojovou revizi - ověřit existenci a kategorii
      const srcResult = await client.query('SELECT id, "kategorieRevize", "skupinaRevizi" FROM revize WHERE id = $1', [sourceId]);
      if (srcResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Zdrojová revize nebyla nalezena' });
      }
      const src = srcResult.rows[0];
      console.log(`📋 Zdrojová revize: ID=${src.id}, kategorie=${src.kategorieRevize}`);

      // 2. Skupina revizí – pouze pro navazující revize
      let skupinaRevizi: string | null = null;
      let predchoziId: number | null = null;

      if (typ === 'navazujici') {
        skupinaRevizi = src.skupinaRevizi || `grp-${sourceId}-${Date.now()}`;
        predchoziId = sourceId;

        // Pokud zdrojová neměla skupinu, přiřadit ji zpětně
        if (!src.skupinaRevizi) {
          await client.query('UPDATE revize SET "skupinaRevizi" = $1 WHERE id = $2', [skupinaRevizi, sourceId]);
        }
      }

      const now = new Date().toISOString();
      const datum = new Date().toISOString().split('T')[0];

      // 3. Dynamicky zjistit všechny sloupce tabulky revize
      const colResult = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'revize' 
        ORDER BY ordinal_position
      `);
      const allColumns = colResult.rows.map((r: any) => r.column_name as string);

      // Sloupce, které se NEPŘEPISUJÍ ze zdroje (mají vlastní hodnoty)
      const overrides: Record<string, any> = {
        'id': undefined,                  // auto-generováno
        'cisloRevize': noveCislo,
        'datum': datum,
        'datumDokonceni': null,           // nová revize není dokončená
        'datumPlatnosti': null,           // nová revize nemá platnost
        'datumVypracovani': null,         // bude vyplněno později
        'typRevize': 'pravidelná',
        'stav': 'rozpracováno',
        'vysledek': null,                 // nová revize nemá výsledek
        'vysledekOduvodneni': null,
        'zaver': null,                    // nová revize nemá závěr
        'predchoziRevizeId': predchoziId,
        'skupinaRevizi': skupinaRevizi,
        'createdAt': now,
        'updatedAt': now,
      };

      // Sestavit INSERT dynamicky - kopíruje VŠECHNY sloupce z DB
      const insertColumns: string[] = [];
      const selectParts: string[] = [];
      const params: any[] = [sourceId]; // $1 = sourceId pro WHERE klauzuli v SELECT
      let paramIdx = 2;

      for (const col of allColumns) {
        if (col === 'id') continue; // id je auto-generováno

        insertColumns.push(`"${col}"`);

        if (col in overrides) {
          params.push(overrides[col]);
          selectParts.push(`$${paramIdx}::${col === 'predchoziRevizeId' ? 'integer' : 'text'}`);
          paramIdx++;
        } else {
          // Zkopírovat hodnotu přímo ze zdrojové revize
          selectParts.push(`"${col}"`);
        }
      }

      const insertSQL = `
        INSERT INTO revize (${insertColumns.join(', ')})
        SELECT ${selectParts.join(', ')}
        FROM revize WHERE id = $1
        RETURNING id, "kategorieRevize"
      `;

      const newRevize = await client.query(insertSQL, params);
      const newRevizeId = newRevize.rows[0].id;
      const newKategorie = newRevize.rows[0].kategorieRevize;
      console.log(`✅ Nová revize ID=${newRevizeId}, kategorie=${newKategorie}`);

      // 4. Zkopírovat rozvaděče + okruhy
      const rozvadece = await client.query('SELECT * FROM rozvadec WHERE "revizeId" = $1', [sourceId]);
      for (const rozv of rozvadece.rows) {
        const newRozv = await client.query(`
          INSERT INTO rozvadec ("revizeId", nazev, oznaceni, umisteni, "typRozvadece", "stupenKryti", poznamka, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id
        `, [newRevizeId, rozv.nazev, rozv.oznaceni, rozv.umisteni, rozv.typRozvadece, rozv.stupenKryti, rozv.poznamka, now, now]);
        const newRozvId = newRozv.rows[0].id;

        // Okruhy
        const okruhy = await client.query('SELECT * FROM okruh WHERE "rozvadecId" = $1', [rozv.id]);
        for (const okr of okruhy.rows) {
          await client.query(`
            INSERT INTO okruh ("rozvadecId", cislo, nazev, "jisticTyp", "jisticProud", "pocetFazi", vodic, "typKabelu", "pocetZil", prurez, "izolacniOdpor", "impedanceSmycky", poznamka)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          `, [newRozvId, okr.cislo, okr.nazev, okr.jisticTyp, okr.jisticProud, okr.pocetFazi, okr.vodic, okr.typKabelu, okr.pocetZil, okr.prurez, okr.izolacniOdpor, okr.impedanceSmycky, okr.poznamka]);
        }
      }
      console.log(`  ✅ Zkopírováno ${rozvadece.rows.length} rozvaděčů`);

      // 5. Zkopírovat místnosti + zařízení
      const mistnosti = await client.query('SELECT * FROM mistnost WHERE "revizeId" = $1', [sourceId]);
      for (const mist of mistnosti.rows) {
        const newMist = await client.query(`
          INSERT INTO mistnost ("revizeId", nazev, patro, plocha, typ, prostredi, poznamka)
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `, [newRevizeId, mist.nazev, mist.patro, mist.plocha, mist.typ, mist.prostredi, mist.poznamka]);
        const newMistId = newMist.rows[0].id;

        // Zařízení v místnosti
        const zarizeni = await client.query('SELECT * FROM zarizeni WHERE "mistnostId" = $1', [mist.id]);
        for (const zar of zarizeni.rows) {
          await client.query(`
            INSERT INTO zarizeni ("mistnostId", nazev, oznaceni, "pocetKs", trida, "prikonW", "ochranaPredDotykem", stav, poznamka)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `, [newMistId, zar.nazev, zar.oznaceni, zar.pocetKs, zar.trida, zar.prikonW, zar.ochranaPredDotykem, zar.stav, zar.poznamka]);
        }
      }
      console.log(`  ✅ Zkopírováno ${mistnosti.rows.length} místností`);

      // 6. Zkopírovat vazby přístrojů
      const pristroje = await client.query('SELECT * FROM "revizePristroj" WHERE "revizeId" = $1', [sourceId]);
      for (const rp of pristroje.rows) {
        await client.query(`
          INSERT INTO "revizePristroj" ("revizeId", "pristrojId", "datumKalibrace", "platnostKalibrace")
          VALUES ($1, $2, $3, $4)
        `, [newRevizeId, rp.pristrojId, rp.datumKalibrace, rp.platnostKalibrace]);
      }
      console.log(`  ✅ Zkopírováno ${pristroje.rows.length} přístrojů`);

      // 7. Závady se NE kopírují – nová revize začíná s čistým štítem
      // (předchozí závady jsou vidět přes historii)

      await client.query('COMMIT');
      console.log(`✅ Duplikace dokončena: revize ${sourceId} (${src.kategorieRevize}) → ${newRevizeId} (${newKategorie})`);
      res.json({ id: newRevizeId, skupinaRevizi });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Chyba při duplikaci revize:', error);
      res.status(500).json({ error: (error as Error).message });
    } finally {
      client.release();
    }
  });

  // ==================== HISTORIE REVIZÍ ====================
  app.get('/api/revize/:id/historie', authMiddleware, async (req, res) => {
    try {
      const revizeId = parseInt(req.params.id);
      // Zjistit skupinu
      const revResult = await pool.query('SELECT "skupinaRevizi" FROM revize WHERE id = $1', [revizeId]);
      if (revResult.rows.length === 0) return res.status(404).json({ error: 'Revize nenalezena' });

      const skupina = revResult.rows[0].skupinaRevizi;
      if (!skupina) {
        // Nemá skupinu – vrátit jen sebe
        const self = await pool.query('SELECT id, "cisloRevize", nazev, datum, stav, "typRevize", vysledek, "createdAt" FROM revize WHERE id = $1', [revizeId]);
        return res.json(self.rows);
      }

      // Všechny revize se stejnou skupinou, seřazené od nejstarší
      const result = await pool.query(
        'SELECT id, "cisloRevize", nazev, datum, stav, "typRevize", vysledek, "predchoziRevizeId", "createdAt" FROM revize WHERE "skupinaRevizi" = $1 ORDER BY datum ASC, id ASC',
        [skupina]
      );
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== ROZVADĚČE ====================
  app.get('/api/rozvadece/:revizeId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM rozvadec WHERE "revizeId" = $1 ORDER BY poradi NULLS LAST, id', [req.params.revizeId]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/rozvadece', authMiddleware, async (req, res) => {
    try {
      const { revizeId, nazev, oznaceni, umisteni, typRozvadece, stupenKryti, poznamka } = req.body;
      const now = new Date().toISOString();
      
      const result = await pool.query(`
        INSERT INTO rozvadec ("revizeId", nazev, oznaceni, umisteni, "typRozvadece", "stupenKryti", poznamka, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [revizeId, nazev, oznaceni, umisteni, typRozvadece, stupenKryti, poznamka, now, now]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/rozvadece/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const updates = { ...req.body, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE rozvadec SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/rozvadece/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM rozvadec WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== OKRUHY ====================
  app.get('/api/okruhy/:rozvadecId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM okruh WHERE "rozvadecId" = $1 ORDER BY cislo', [req.params.rozvadecId]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/okruhy', authMiddleware, async (req, res) => {
    try {
      const { rozvadecId, cislo, nazev, jisticTyp, jisticProud, pocetFazi, vodic, typKabelu, pocetZil, prurez, izolacniOdpor, impedanceSmycky, poznamka } = req.body;
      
      const result = await pool.query(`
        INSERT INTO okruh ("rozvadecId", cislo, nazev, "jisticTyp", "jisticProud", "pocetFazi", vodic, "typKabelu", "pocetZil", prurez, "izolacniOdpor", "impedanceSmycky", poznamka)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id
      `, [rozvadecId, cislo, nazev, jisticTyp, jisticProud, pocetFazi, vodic, typKabelu, pocetZil, prurez, izolacniOdpor, impedanceSmycky, poznamka]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/okruhy/:id', authMiddleware, async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE okruh SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/okruhy/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM okruh WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== CHRANIČE ====================
  app.get('/api/chranice/:rozvadecId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM chranic WHERE "rozvadecId" = $1 ORDER BY cislo', [req.params.rozvadecId]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/chranice', authMiddleware, async (req, res) => {
    try {
      const { rozvadecId, cislo, nazev, typ, proud, citlivostMa, pocetPolu,
        testovacitlacitko, nevybavovaci, dotykoveNapeti, vybavovacProud,
        casOdpojeni1x, casOdpojeni5x, casOdpojeni1_4x, casOdpojeni2x,
        zkouskaVypnuti2x, selektivita, poznamka } = req.body;
      const result = await pool.query(`
        INSERT INTO chranic ("rozvadecId", cislo, nazev, typ, proud, "citlivostMa", "pocetPolu",
          "testovacitlacitko", nevybavovaci, "dotykoveNapeti", "vybavovacProud",
          "casOdpojeni1x", "casOdpojeni5x", "casOdpojeni1_4x", "casOdpojeni2x",
          "zkouskaVypnuti2x", selektivita, poznamka)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
        RETURNING id
      `, [rozvadecId, cislo, nazev, typ, proud, citlivostMa, pocetPolu,
          testovacitlacitko, nevybavovaci, dotykoveNapeti, vybavovacProud,
          casOdpojeni1x, casOdpojeni5x, casOdpojeni1_4x, casOdpojeni2x,
          zkouskaVypnuti2x, selektivita, poznamka]);
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/chranice/:id', authMiddleware, async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE chranic SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/chranice/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM chranic WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });
  app.get('/api/mistnosti', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM mistnost');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/mistnosti/revize/:revizeId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM mistnost WHERE "revizeId" = $1', [req.params.revizeId]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/mistnosti', authMiddleware, async (req, res) => {
    try {
      const { revizeId, nazev, patro, plocha, typ, prostredi, poznamka } = req.body;
      
      const result = await pool.query(`
        INSERT INTO mistnost ("revizeId", nazev, patro, plocha, typ, prostredi, poznamka)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [revizeId, nazev, patro, plocha, typ, prostredi, poznamka]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/mistnosti/:id', authMiddleware, async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE mistnost SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/mistnosti/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM mistnost WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== ZAŘÍZENÍ ====================
  app.get('/api/zarizeni/:mistnostId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM zarizeni WHERE "mistnostId" = $1', [req.params.mistnostId]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/zarizeni', authMiddleware, async (req, res) => {
    try {
      const { mistnostId, nazev, oznaceni, pocetKs, trida, prikonW, ochranaPredDotykem, stav, poznamka } = req.body;
      
      const result = await pool.query(`
        INSERT INTO zarizeni ("mistnostId", nazev, oznaceni, "pocetKs", trida, "prikonW", "ochranaPredDotykem", stav, poznamka)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [mistnostId, nazev, oznaceni, pocetKs, trida, prikonW, ochranaPredDotykem, stav, poznamka]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/zarizeni/:id', authMiddleware, async (req, res) => {
    try {
      const keys = Object.keys(req.body);
      const values = Object.values(req.body);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE zarizeni SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/zarizeni/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM zarizeni WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== ZÁVADY ====================
  app.get('/api/zavady', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM zavada');
      const rows = result.rows.map((row: Record<string, unknown>) => ({
        ...row,
        fotky: typeof row.fotky === 'string' ? JSON.parse(row.fotky) : (row.fotky || []),
      }));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/zavady/revize/:revizeId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM zavada WHERE "revizeId" = $1', [req.params.revizeId]);
      const rows = result.rows.map((row: Record<string, unknown>) => ({
        ...row,
        fotky: typeof row.fotky === 'string' ? JSON.parse(row.fotky) : (row.fotky || []),
      }));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/zavady', authMiddleware, async (req, res) => {
    try {
      const { revizeId, rozvadecId, mistnostId, popis, zavaznost, stav, fotky, poznamka } = req.body;
      const datumZjisteni = new Date().toISOString().split('T')[0];
      
      const result = await pool.query(`
        INSERT INTO zavada ("revizeId", "rozvadecId", "mistnostId", popis, zavaznost, stav, fotky, "datumZjisteni", poznamka)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [revizeId, rozvadecId, mistnostId, popis, zavaznost, stav, JSON.stringify(fotky || []), datumZjisteni, poznamka]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/zavady/:id', authMiddleware, async (req, res) => {
    try {
      const updates = { ...req.body };
      if (updates.fotky) updates.fotky = JSON.stringify(updates.fotky);
      
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE zavada SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/zavady/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM zavada WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== FIRMY ====================
  app.get('/api/firmy', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM firma ORDER BY nazev');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/firmy/:id', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM firma WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Firma nenalezena' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/firmy', authMiddleware, async (req, res) => {
    try {
      const { nazev, adresa, ico, dic, kontaktOsoba, telefon, email, poznamka } = req.body;
      const now = new Date().toISOString();
      
      const result = await pool.query(`
        INSERT INTO firma (nazev, adresa, ico, dic, "kontaktOsoba", telefon, email, poznamka, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [nazev, adresa, ico, dic, kontaktOsoba, telefon, email, poznamka, now, now]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/firmy/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const updates = { ...req.body, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE firma SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/firmy/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM firma WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== ZAKÁZKY ====================
  app.get('/api/zakazky', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM zakazka ORDER BY "datumPlanovany" DESC');
      const rows = result.rows.map((r: any) => ({
        ...r,
        datumyRealizace: r.datumyRealizace ? JSON.parse(r.datumyRealizace) : [],
      }));
      res.json(rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/zakazky', authMiddleware, async (req, res) => {
    try {
      const { nazev, klient, adresa, datumPlanovany, casPlanovany, stav, priorita, revizeId, poznamka,
              datumyRealizace, lhutaZpravyDni, datumOdevzdaniZpravy } = req.body;
      const now = new Date().toISOString();
      const realizaceJson = Array.isArray(datumyRealizace) && datumyRealizace.length > 0
        ? JSON.stringify(datumyRealizace) : null;

      const result = await pool.query(`
        INSERT INTO zakazka (nazev, klient, adresa, "datumPlanovany", "casPlanovany", stav, priorita,
          "revizeId", poznamka, "datumyRealizace", "lhutaZpravyDni", "datumOdevzdaniZpravy", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING id
      `, [nazev, klient, adresa, datumPlanovany, casPlanovany || null, stav, priorita,
          revizeId || null, poznamka || null, realizaceJson, lhutaZpravyDni ?? 4,
          datumOdevzdaniZpravy || null, now, now]);

      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/zakazky/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const body = { ...req.body };
      // Serializace pole datumyRealizace
      if (Array.isArray(body.datumyRealizace)) {
        body.datumyRealizace = body.datumyRealizace.length > 0
          ? JSON.stringify(body.datumyRealizace) : null;
      }
      const updates = { ...body, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);

      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE zakazka SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/zakazky/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM zakazka WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== MĚŘÍCÍ PŘÍSTROJE ====================
  app.get('/api/pristroje', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM "mericiPristroj" ORDER BY nazev');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/pristroje/:id', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM "mericiPristroj" WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Přístroj nenalezen' });
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/pristroje', authMiddleware, async (req, res) => {
    try {
      const { nazev, vyrobce, model, vyrobniCislo, typPristroje, datumKalibrace, platnostKalibrace, kalibracniList, poznamka } = req.body;
      const now = new Date().toISOString();
      
      const result = await pool.query(`
        INSERT INTO "mericiPristroj" (nazev, vyrobce, model, "vyrobniCislo", "typPristroje", "datumKalibrace", "platnostKalibrace", "kalibracniList", poznamka, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id
      `, [nazev, vyrobce, model, vyrobniCislo, typPristroje, datumKalibrace, platnostKalibrace, kalibracniList, poznamka, now, now]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/pristroje/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const updates = { ...req.body, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE "mericiPristroj" SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/pristroje/:id', authMiddleware, async (req, res) => {
    try {
      // Nejprve smazat vazby na revize
      await pool.query('DELETE FROM "revizePristroj" WHERE "pristrojId" = $1', [req.params.id]);
      await pool.query('DELETE FROM "mericiPristroj" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== KALIBRACE (historie) ====================
  app.get('/api/kalibrace/:pristrojId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM kalibrace WHERE "pristrojId" = $1 ORDER BY "datumKalibrace" DESC',
        [req.params.pristrojId]
      );
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/kalibrace', authMiddleware, async (req, res) => {
    try {
      const { pristrojId, datumKalibrace, platnostKalibrace, kalibracniList, provedl, certifikat, poznamka } = req.body;
      const now = new Date().toISOString();

      const result = await pool.query(`
        INSERT INTO kalibrace ("pristrojId", "datumKalibrace", "platnostKalibrace", "kalibracniList", provedl, certifikat, poznamka, "createdAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [pristrojId, datumKalibrace, platnostKalibrace, kalibracniList || null, provedl || null, certifikat || null, poznamka || null, now]);

      // Aktualizovat aktuální kalibraci na přístroji
      await pool.query(`
        UPDATE "mericiPristroj" SET "datumKalibrace" = $1, "platnostKalibrace" = $2, "updatedAt" = $3 WHERE id = $4
      `, [datumKalibrace, platnostKalibrace, now, pristrojId]);

      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/kalibrace/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM kalibrace WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== REVIZE-PŘÍSTROJ (vazby) ====================
  app.get('/api/revize-pristroje/:revizeId', authMiddleware, async (req, res) => {
    try {
      // Vrací přístroje se snapshot kalibrací (původní kalibrace z doby přidání k revizi)
      const result = await pool.query(`
        SELECT mp.*,
          COALESCE(rp."datumKalibrace", mp."datumKalibrace") AS "datumKalibrace",
          COALESCE(rp."platnostKalibrace", mp."platnostKalibrace") AS "platnostKalibrace"
        FROM "mericiPristroj" mp
        JOIN "revizePristroj" rp ON mp.id = rp."pristrojId"
        WHERE rp."revizeId" = $1
      `, [req.params.revizeId]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/revize-pristroje', authMiddleware, async (req, res) => {
    try {
      const { revizeId, pristrojId } = req.body;
      
      // Načíst aktuální kalibraci přístroje a uložit jako snapshot
      const pristrojResult = await pool.query(
        'SELECT "datumKalibrace", "platnostKalibrace" FROM "mericiPristroj" WHERE id = $1',
        [pristrojId]
      );
      const pristroj = pristrojResult.rows[0];
      
      const result = await pool.query(`
        INSERT INTO "revizePristroj" ("revizeId", "pristrojId", "datumKalibrace", "platnostKalibrace")
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [revizeId, pristrojId, pristroj?.datumKalibrace || null, pristroj?.platnostKalibrace || null]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/revize-pristroje/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM "revizePristroj" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Alternativní mazání podle revizeId a pristrojId
  app.delete('/api/revize-pristroje/:revizeId/:pristrojId', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM "revizePristroj" WHERE "revizeId" = $1 AND "pristrojId" = $2', [req.params.revizeId, req.params.pristrojId]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== ZÁKAZNÍCI ====================
  app.get('/api/zakaznici', authMiddleware, async (req, res) => {
    try {
      // Získat zákazníky s počtem revizí
      const result = await pool.query(`
        SELECT z.*, COUNT(r.id) as "pocetRevizi"
        FROM zakaznik z
        LEFT JOIN revize r ON r."zakaznikId" = z.id
        GROUP BY z.id
        ORDER BY z.nazev
      `);
      res.json(result.rows);
    } catch (error: any) {
      console.error('Error getting zakaznici:', error);
      // Pokud tabulka nebo sloupec neexistuje, vrátit prázdný seznam
      if (error.message?.includes('does not exist')) {
        return res.json([]);
      }
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/zakaznici/:id', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT z.*, COUNT(r.id) as "pocetRevizi"
        FROM zakaznik z
        LEFT JOIN revize r ON r."zakaznikId" = z.id
        WHERE z.id = $1
        GROUP BY z.id
      `, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Zákazník nenalezen' });
      res.json(result.rows[0]);
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return res.status(404).json({ error: 'Zákazník nenalezen' });
      }
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/zakaznici/:id/revize', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(
        'SELECT * FROM revize WHERE "zakaznikId" = $1 ORDER BY datum DESC',
        [req.params.id]
      );
      res.json(result.rows);
    } catch (error: any) {
      if (error.message?.includes('does not exist')) {
        return res.json([]);
      }
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/zakaznici', authMiddleware, async (req, res) => {
    try {
      const { nazev, adresa, ico, dic, kontaktOsoba, telefon, email, poznamka } = req.body;
      const now = new Date().toISOString();
      
      const result = await pool.query(`
        INSERT INTO zakaznik (nazev, adresa, ico, dic, "kontaktOsoba", telefon, email, poznamka, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [nazev, adresa, ico, dic, kontaktOsoba, telefon, email, poznamka, now, now]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      console.error('Error creating zakaznik:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/zakaznici/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const updates = { ...req.body, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE zakaznik SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating zakaznik:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/zakaznici/:id', authMiddleware, async (req, res) => {
    try {
      // Odebrat vazbu na zákazníka z revizí
      await pool.query('UPDATE revize SET "zakaznikId" = NULL WHERE "zakaznikId" = $1', [req.params.id]);
      // Smazat zákazníka
      await pool.query('DELETE FROM zakaznik WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== NASTAVENÍ ====================
  app.get('/api/nastaveni', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM nastaveni LIMIT 1');
      res.json(result.rows[0] || null);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/technik-historie', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM "technikHistorie" ORDER BY "createdAt" DESC');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/technik-historie', authMiddleware, async (req, res) => {
    try {
      const { reviznniTechnikJmeno, reviznniTechnikCisloOpravneni, reviznniTechnikPlatnostOpravneni, reviznniTechnikOsvedceni, reviznniTechnikPlatnostOsvedceni, platOd } = req.body;
      const now = new Date().toISOString();
      const result = await pool.query(
        `INSERT INTO "technikHistorie" ("reviznniTechnikJmeno", "reviznniTechnikCisloOpravneni", "reviznniTechnikPlatnostOpravneni", "reviznniTechnikOsvedceni", "reviznniTechnikPlatnostOsvedceni", "platOd", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [reviznniTechnikJmeno, reviznniTechnikCisloOpravneni, reviznniTechnikPlatnostOpravneni, reviznniTechnikOsvedceni, reviznniTechnikPlatnostOsvedceni, platOd, now]
      );
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/technik-historie/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM "technikHistorie" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/nastaveni', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const existing = await pool.query('SELECT * FROM nastaveni LIMIT 1');

      if (existing.rows.length === 0) {
        const data = { ...req.body };
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        await pool.query(`
          INSERT INTO nastaveni (${keys.map(k => `"${k}"`).join(', ')}, "createdAt", "updatedAt")
          VALUES (${placeholders}, $${keys.length + 1}, $${keys.length + 2})
        `, [...values, now, now]);
      } else {
        const data = { ...req.body, updatedAt: now };
        const keys = Object.keys(data);
        const values = Object.values(data);

        const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
        await pool.query(`UPDATE nastaveni SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, existing.rows[0].id]);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== KATALOG ZÁVAD ====================
  app.get('/api/zavady-katalog', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM "zavadaKatalog" ORDER BY kategorie, popis');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/zavady-katalog', authMiddleware, async (req, res) => {
    try {
      const { popis, zavaznost, norma, clanek, zneniClanku, kategorie } = req.body;
      const now = new Date().toISOString();
      
      const result = await pool.query(`
        INSERT INTO "zavadaKatalog" (popis, zavaznost, norma, clanek, "zneniClanku", kategorie, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [popis, zavaznost, norma, clanek, zneniClanku, kategorie, now, now]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/zavady-katalog/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const updates = { ...req.body, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE "zavadaKatalog" SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/zavady-katalog/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM "zavadaKatalog" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== PŘEDVOLENÉ TEXTY ====================
  app.get('/api/predvolene-texty', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM "predvolenyText" ORDER BY pole, poradi, id');
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/predvolene-texty/:pole', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM "predvolenyText" WHERE pole = $1 ORDER BY poradi, id', [req.params.pole]);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/predvolene-texty', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const { pole, nazev, text, poradi } = req.body;
      const result = await pool.query(
        'INSERT INTO "predvolenyText" (pole, nazev, text, poradi, "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
        [pole, nazev, text, poradi || 0, now, now]
      );
      res.json({ id: result.rows[0].id, success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/predvolene-texty/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const { nazev, text, poradi } = req.body;
      await pool.query(
        'UPDATE "predvolenyText" SET nazev = $1, text = $2, poradi = $3, "updatedAt" = $4 WHERE id = $5',
        [nazev, text, poradi || 0, now, req.params.id]
      );
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/predvolene-texty/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM "predvolenyText" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== BACKUP ====================

  // Kompletní tabulky pro backup
  const ALL_BACKUP_TABLES = [
    'revize', 'rozvadec', 'okruh', 'zavada', 'mistnost', 'zarizeni',
    'zakazka', 'mericiPristroj', 'revizePristroj', 'kalibrace', 'firma', 'nastaveni',
    'zavadaKatalog', 'zakaznik', 'predvolenyText'
  ];

  // Statistiky databáze (lehký endpoint - pouze počty)
  app.get('/api/backup/stats', authMiddleware, async (req, res) => {
    try {
      const stats: Record<string, number> = {};
      for (const table of ALL_BACKUP_TABLES) {
        const result = await pool.query(`SELECT COUNT(*) as count FROM "${table}"`);
        stats[table] = parseInt(result.rows[0].count);
      }
      
      // Velikost databáze v MB
      const sizeResult = await pool.query(`SELECT pg_database_size(current_database()) as size`);
      const sizeMB = (parseInt(sizeResult.rows[0].size) / 1024 / 1024).toFixed(2);

      res.json({ stats, sizeMB });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Export – kompletní data
  app.get('/api/backup', authMiddleware, async (req, res) => {
    try {
      const backup: Record<string, any> = {
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        appName: 'RevizeApp',
      };
      
      for (const table of ALL_BACKUP_TABLES) {
        const result = await pool.query(`SELECT * FROM "${table}"`);
        backup[table] = result.rows;
      }
      
      res.json(backup);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Import
  app.post('/api/backup/import', authMiddleware, async (req, res) => {
    try {
      const { data, mode } = req.body;
      
      // Pořadí mazání – závislé tabulky napřed
      const deleteOrder = [
        'kalibrace', 'revizePristroj', 'zarizeni', 'zavada', 'okruh', 'zakazka',
        'rozvadec', 'mistnost', 'revize', 'sablona', 'pdfSablona', 'firma',
        'mericiPristroj', 'nastaveni', 'zavadaKatalog', 'zakaznik'
      ];
      
      if (mode === 'replace') {
        for (const table of deleteOrder) {
          try {
            await pool.query(`DELETE FROM "${table}"`);
          } catch (e) {
            console.warn(`Nelze smazat tabulku ${table}:`, (e as Error).message);
          }
        }
      }
      
      // Pořadí importu – nezávislé tabulky napřed
      const importOrder = [
        'nastaveni', 'firma', 'zakaznik', 'mericiPristroj', 'sablona',
        'pdfSablona', 'zavadaKatalog',
        'revize', 'mistnost', 'rozvadec', 'zakazka',
        'okruh', 'zavada', 'zarizeni', 'revizePristroj', 'kalibrace'
      ];
      
      const skipKeys = ['version', 'timestamp', 'appName'];
      let importedCount = 0;
      let errorCount = 0;
      
      // Import v definovaném pořadí
      for (const table of importOrder) {
        const records = data[table];
        if (!records || !Array.isArray(records) || records.length === 0) continue;
        
        for (const record of records as any[]) {
          const cols = Object.keys(record);
          const values = Object.values(record);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          
          try {
            await pool.query(`
              INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `, values);
            importedCount++;
          } catch (e) {
            errorCount++;
            console.error(`Import error for ${table}:`, (e as Error).message);
          }
        }
      }
      
      // Import zbývajících tabulek (pokud by nějaké chyběly v importOrder)
      for (const [table, records] of Object.entries(data)) {
        if (skipKeys.includes(table) || importOrder.includes(table)) continue;
        if (!Array.isArray(records) || records.length === 0) continue;
        
        for (const record of records as any[]) {
          const cols = Object.keys(record);
          const values = Object.values(record);
          const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
          
          try {
            await pool.query(`
              INSERT INTO "${table}" (${cols.map(c => `"${c}"`).join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `, values);
            importedCount++;
          } catch (e) {
            errorCount++;
            console.error(`Import error for ${table}:`, (e as Error).message);
          }
        }
      }

      // Reset SERIAL sekvencí po importu
      for (const table of ALL_BACKUP_TABLES) {
        try {
          await pool.query(`
            SELECT setval(
              pg_get_serial_sequence('"${table}"', 'id'),
              COALESCE((SELECT MAX(id) FROM "${table}"), 0) + 1,
              false
            )
          `);
        } catch (_) {
          // Některé tabulky nemusí mít serial id
        }
      }
      
      res.json({ success: true, imported: importedCount, errors: errorCount });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // Čištění starých dat
  app.post('/api/backup/clean', authMiddleware, async (req, res) => {
    try {
      const { daysOld = 365 } = req.body;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      const cutoffStr = cutoffDate.toISOString().split('T')[0];

      // Získat ID starých schválených revizí
      const oldRevize = await pool.query(
        `SELECT id FROM revize WHERE stav = 'schváleno' AND datum < $1`,
        [cutoffStr]
      );
      const ids = oldRevize.rows.map((r: any) => r.id);

      if (ids.length === 0) {
        return res.json({ success: true, deleted: 0, message: 'Žádné staré revize k vymazání' });
      }

      // Smazat závislé záznamy
      const placeholders = ids.map((_: any, i: number) => `$${i + 1}`).join(', ');
      await pool.query(`DELETE FROM "revizePristroj" WHERE "revizeId" IN (${placeholders})`, ids);
      await pool.query(`DELETE FROM zarizeni WHERE "mistnostId" IN (SELECT id FROM mistnost WHERE "revizeId" IN (${placeholders}))`, ids);
      await pool.query(`DELETE FROM zavada WHERE "revizeId" IN (${placeholders})`, ids);
      await pool.query(`DELETE FROM okruh WHERE "rozvadecId" IN (SELECT id FROM rozvadec WHERE "revizeId" IN (${placeholders}))`, ids);
      await pool.query(`DELETE FROM rozvadec WHERE "revizeId" IN (${placeholders})`, ids);
      await pool.query(`DELETE FROM mistnost WHERE "revizeId" IN (${placeholders})`, ids);
      await pool.query(`DELETE FROM revize WHERE id IN (${placeholders})`, ids);

      res.json({ success: true, deleted: ids.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== AI ENDPOINTY ====================

  // Helper: extrahuj srozumitelnou chybovou hlášku z Anthropic erroru
  function getAIErrorMessage(error: any): string {
    // Anthropic SDK error with nested message
    if (error?.error?.error?.message) {
      const msg = error.error.error.message;
      if (msg.includes('credit balance is too low')) {
        return 'Nedostatečný kredit na Anthropic účtu. Dobijte kredit na https://console.anthropic.com/settings/plans';
      }
      if (msg.includes('invalid x-api-key') || msg.includes('Invalid API Key')) {
        return 'Neplatný API klíč. Zkontrolujte ANTHROPIC_API_KEY v server/.env';
      }
      return msg;
    }
    const message = (error as Error).message || 'Neznámá chyba';
    if (message.includes('ANTHROPIC_API_KEY')) return message;
    if (message.includes('credit balance')) return 'Nedostatečný kredit na Anthropic účtu.';
    return message;
  }
  
  // Kontrola konfigurace AI
  app.get('/api/ai/status', authMiddleware, (_req, res) => {
    res.json({ configured: isAIConfigured() });
  });

  // Generování revizní zprávy
  app.post('/api/ai/generate-report', authMiddleware, async (req, res) => {
    try {
      const { revizeId } = req.body;
      
      if (!revizeId) {
        return res.status(400).json({ error: 'revizeId je povinné' });
      }

      // Načíst všechna data revize
      const revizeResult = await pool.query('SELECT * FROM revize WHERE id = $1', [revizeId]);
      if (revizeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Revize nenalezena' });
      }
      const revize = revizeResult.rows[0];

      const [rozvadeceRes, zavadyRes, mistnostiRes, nastaveniRes] = await Promise.all([
        pool.query('SELECT * FROM rozvadec WHERE "revizeId" = $1', [revizeId]),
        pool.query('SELECT * FROM zavada WHERE "revizeId" = $1', [revizeId]),
        pool.query('SELECT * FROM mistnost WHERE "revizeId" = $1', [revizeId]),
        pool.query('SELECT * FROM nastaveni LIMIT 1'),
      ]);

      // Okruhy pro všechny rozvaděče
      const rozvadecIds = rozvadeceRes.rows.map((r: any) => r.id);
      let okruhy: any[] = [];
      if (rozvadecIds.length > 0) {
        const placeholders = rozvadecIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
        const okruhyRes = await pool.query(`SELECT * FROM okruh WHERE "rozvadecId" IN (${placeholders})`, rozvadecIds);
        okruhy = okruhyRes.rows;
      }

      // Zařízení pro všechny místnosti
      const mistnostIds = mistnostiRes.rows.map((m: any) => m.id);
      let zarizeni: any[] = [];
      if (mistnostIds.length > 0) {
        const placeholders = mistnostIds.map((_: any, i: number) => `$${i + 1}`).join(', ');
        const zarizeniRes = await pool.query(`SELECT * FROM zarizeni WHERE "mistnostId" IN (${placeholders})`, mistnostIds);
        zarizeni = zarizeniRes.rows;
      }

      // Měřicí přístroje (se snapshot kalibrací)
      const pristrojeRes = await pool.query(
        `SELECT mp.*,
          COALESCE(rp."datumKalibrace", mp."datumKalibrace") AS "datumKalibrace",
          COALESCE(rp."platnostKalibrace", mp."platnostKalibrace") AS "platnostKalibrace"
         FROM "mericiPristroj" mp 
         JOIN "revizePristroj" rp ON mp.id = rp."pristrojId" 
         WHERE rp."revizeId" = $1`, [revizeId]
      );

      // Zákazník
      let zakaznik = null;
      if (revize.zakaznikId) {
        const zakRes = await pool.query('SELECT * FROM zakaznik WHERE id = $1', [revize.zakaznikId]);
        if (zakRes.rows.length > 0) zakaznik = zakRes.rows[0];
      }

      const report = await generateReport({
        revize,
        rozvadece: rozvadeceRes.rows,
        okruhy,
        zavady: zavadyRes.rows,
        mistnosti: mistnostiRes.rows,
        zarizeni,
        pristroje: pristrojeRes.rows,
        nastaveni: nastaveniRes.rows[0] || null,
        zakaznik,
      });

      res.json({ text: report });
    } catch (error) {
      console.error('❌ AI generate-report error:', error);
      const userMessage = getAIErrorMessage(error);
      res.status(500).json({ error: userMessage });
    }
  });

  // Chat asistent
  app.post('/api/ai/chat', authMiddleware, async (req, res) => {
    try {
      const { messages, revizeContext } = req.body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'messages je povinné pole' });
      }

      const reply = await chatWithAssistant(messages, revizeContext);
      res.json({ reply });
    } catch (error) {
      console.error('❌ AI chat error:', error);
      const userMessage = getAIErrorMessage(error);
      res.status(500).json({ error: userMessage });
    }
  });

  // Auto-vyplňování
  app.post('/api/ai/autofill', authMiddleware, async (req, res) => {
    try {
      const { field, formData, entityType } = req.body;
      
      if (!field || !entityType) {
        return res.status(400).json({ error: 'field a entityType jsou povinné' });
      }

      const suggestion = await getAutofillSuggestion({ field, formData: formData || {}, entityType });
      res.json({ suggestion });
    } catch (error) {
      console.error('❌ AI autofill error:', error);
      const userMessage = getAIErrorMessage(error);
      res.status(500).json({ error: userMessage });
    }
  });

  // Analýza fotografií rozvaděče
  app.post('/api/ai/analyze-photos', authMiddleware, async (req, res) => {
    try {
      const { images, rozvadecId } = req.body;

      if (!Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: 'images musí být neprázdné pole' });
      }
      if (images.length > 5) {
        return res.status(400).json({ error: 'Maximálně 5 fotografií' });
      }
      if (!rozvadecId) {
        return res.status(400).json({ error: 'rozvadecId je povinné' });
      }

      // Načíst název rozvaděče pro kontext AI
      const rozvadecResult = await pool.query('SELECT nazev FROM rozvadece WHERE id = $1', [rozvadecId]);
      const rozvadecNazev = rozvadecResult.rows[0]?.nazev || 'Rozvaděč';

      const okruhy = await analyzeRozvadecPhotos(images, rozvadecNazev);
      res.json({ okruhy });
    } catch (error) {
      console.error('❌ AI analyze-photos error:', error);
      const userMessage = getAIErrorMessage(error);
      res.status(500).json({ error: userMessage });
    }
  });

  // ==================== SPA FALLBACK ====================
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint nenalezen' });
    }
    
    const possiblePaths = [
      path.join(__dirname, '..', 'dist', 'index.html'),
      path.join(process.cwd(), 'dist', 'index.html'),
      '/app/dist/index.html'
    ];
    
    for (const indexPath of possiblePaths) {
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    
    res.status(404).send('Frontend není dostupný');
  });

  // Start server
  app.listen(PORT, () => {
    console.log(`\n🚀 RevizeApp Server běží na http://localhost:${PORT}`);
    console.log(`📊 Zdravotní kontrola: http://localhost:${PORT}/api/health`);
    console.log(`🐘 Databáze: PostgreSQL`);
    console.log(`🌐 CORS povolena pro: ${CORS_ORIGINS.join(', ')}\n`);
  });
}

startServer().catch(console.error);
