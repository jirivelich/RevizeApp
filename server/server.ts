import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { pool, initializeDatabase } from './database';
import { authMiddleware, loginUser, registerUser, AuthRequest } from './auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Middleware
app.use(cors({
  origin: CORS_ORIGIN,
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
      const { cisloRevize, nazev, adresa, objednatel, datum, termin, typRevize, stav } = req.body;
      const now = new Date().toISOString();
      
      const result = await pool.query(`
        INSERT INTO revize ("cisloRevize", nazev, adresa, objednatel, datum, termin, "typRevize", stav, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [cisloRevize, nazev, adresa, objednatel, datum, termin, typRevize, stav, now, now]);
      
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
        'firmaIco', 'firmaDic', 'zaver', 'kategorieRevize', 'updatedAt'
      ];
      
      const updates: Record<string, any> = { updatedAt: now };
      for (const key of Object.keys(req.body)) {
        if (allowedColumns.includes(key)) {
          updates[key] = req.body[key];
        }
      }
      
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
      await pool.query('DELETE FROM revize WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== ROZVADĚČE ====================
  app.get('/api/rozvadece/:revizeId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM rozvadec WHERE "revizeId" = $1', [req.params.revizeId]);
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
      const { rozvadecId, cislo, nazev, jisticTyp, jisticProud, pocetFazi, vodic, izolacniOdpor, impedanceSmycky, proudovyChranicMa, casOdpojeni, poznamka } = req.body;
      
      const result = await pool.query(`
        INSERT INTO okruh ("rozvadecId", cislo, nazev, "jisticTyp", "jisticProud", "pocetFazi", vodic, "izolacniOdpor", "impedanceSmycky", "proudovyChranicMa", "casOdpojeni", poznamka)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [rozvadecId, cislo, nazev, jisticTyp, jisticProud, pocetFazi, vodic, izolacniOdpor, impedanceSmycky, proudovyChranicMa, casOdpojeni, poznamka]);
      
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

  // ==================== MÍSTNOSTI ====================
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
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/zavady/revize/:revizeId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM zavada WHERE "revizeId" = $1', [req.params.revizeId]);
      res.json(result.rows);
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
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/zakazky', authMiddleware, async (req, res) => {
    try {
      const { nazev, klient, adresa, datumPlanovany, stav, priorita, revizeId, poznamka } = req.body;
      const now = new Date().toISOString();
      
      const result = await pool.query(`
        INSERT INTO zakazka (nazev, klient, adresa, "datumPlanovany", stav, priorita, "revizeId", poznamka, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [nazev, klient, adresa, datumPlanovany, stav, priorita, revizeId, poznamka, now, now]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/zakazky/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const updates = { ...req.body, updatedAt: now };
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
      await pool.query('DELETE FROM "mericiPristroj" WHERE id = $1', [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==================== REVIZE-PŘÍSTROJ (vazby) ====================
  app.get('/api/revize-pristroje/:revizeId', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT mp.* FROM "mericiPristroj" mp
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
      
      const result = await pool.query(`
        INSERT INTO "revizePristroj" ("revizeId", "pristrojId")
        VALUES ($1, $2)
        RETURNING id
      `, [revizeId, pristrojId]);
      
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

  // ==================== ŠABLONY ====================
  // Helper pro konverzi INTEGER polí na boolean
  const booleanFieldsSablona = [
    'jeVychozi', 'zahlaviZobrazitLogo', 'zahlaviZobrazitFirmu', 'zahlaviZobrazitTechnika',
    'uvodniStranaZobrazit', 'uvodniStranaZobrazitFirmu', 'uvodniStranaZobrazitTechnika', 
    'uvodniStranaZobrazitObjekt', 'uvodniStranaZobrazitVyhodnoceni', 'uvodniStranaZobrazitPodpisy',
    'uvodniStranaNadpisRamecek', 'uvodniStranaRamecekUdaje', 'uvodniStranaRamecekObjekt', 
    'uvodniStranaRamecekVyhodnoceni', 'zapatiZobrazitCisloStranky', 'zapatiZobrazitDatum'
  ];
  
  const parseSablonaRow = (row: any) => {
    const result = { ...row };
    // Konvertovat INTEGER na boolean
    for (const field of booleanFieldsSablona) {
      if (field in result) {
        result[field] = result[field] === 1 || result[field] === true;
      }
    }
    // Parsovat JSON pole
    result.sekce = row.sekce ? JSON.parse(row.sekce) : [];
    result.sloupceOkruhu = row.sloupceOkruhu ? JSON.parse(row.sloupceOkruhu) : [];
    result.uvodniStranaBloky = row.uvodniStranaBloky ? JSON.parse(row.uvodniStranaBloky) : undefined;
    return result;
  };

  app.get('/api/sablony', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM sablona ORDER BY nazev');
      const sablony = result.rows.map(parseSablonaRow);
      res.json(sablony);
    } catch (error) {
      console.error('Error getting sablony:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/sablony/vychozi/get', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM sablona WHERE "jeVychozi" = 1 LIMIT 1');
      if (result.rows.length === 0) {
        return res.json(null);
      }
      res.json(parseSablonaRow(result.rows[0]));
    } catch (error) {
      console.error('Error getting vychozi sablona:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/sablony/:id', authMiddleware, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM sablona WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Šablona nenalezena' });
      res.json(parseSablonaRow(result.rows[0]));
    } catch (error) {
      console.error('Error getting sablona:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/sablony', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const data = { ...req.body };
      
      // Konvertovat boolean na integer pro PostgreSQL
      const booleanFields = ['jeVychozi', 'zahlaviZobrazitLogo', 'zahlaviZobrazitFirmu', 'zahlaviZobrazitTechnika',
        'uvodniStranaZobrazit', 'uvodniStranaZobrazitFirmu', 'uvodniStranaZobrazitTechnika', 
        'uvodniStranaZobrazitObjekt', 'uvodniStranaZobrazitVyhodnoceni', 'uvodniStranaZobrazitPodpisy',
        'uvodniStranaNadpisRamecek', 'uvodniStranaRamecekUdaje', 'uvodniStranaRamecekObjekt', 
        'uvodniStranaRamecekVyhodnoceni', 'zapatiZobrazitCisloStranky', 'zapatiZobrazitDatum'];
      
      for (const field of booleanFields) {
        if (field in data) {
          data[field] = data[field] ? 1 : 0;
        }
      }
      
      if (data.sekce) data.sekce = JSON.stringify(data.sekce);
      if (data.sloupceOkruhu) data.sloupceOkruhu = JSON.stringify(data.sloupceOkruhu);
      if (data.uvodniStranaBloky) data.uvodniStranaBloky = JSON.stringify(data.uvodniStranaBloky);
      
      // Pokud je tato šablona výchozí, odebrat příznak z ostatních
      if (data.jeVychozi === 1) {
        await pool.query('UPDATE sablona SET "jeVychozi" = 0 WHERE "jeVychozi" = 1');
      }
      
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      
      const result = await pool.query(`
        INSERT INTO sablona (${keys.map(k => `"${k}"`).join(', ')}, "createdAt", "updatedAt")
        VALUES (${placeholders}, $${keys.length + 1}, $${keys.length + 2})
        RETURNING id
      `, [...values, now, now]);
      
      res.json({ id: result.rows[0].id });
    } catch (error) {
      console.error('Error creating sablona:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.put('/api/sablony/:id', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const data = { ...req.body, updatedAt: now };
      
      // Konvertovat boolean na integer pro PostgreSQL
      const booleanFields = ['jeVychozi', 'zahlaviZobrazitLogo', 'zahlaviZobrazitFirmu', 'zahlaviZobrazitTechnika',
        'uvodniStranaZobrazit', 'uvodniStranaZobrazitFirmu', 'uvodniStranaZobrazitTechnika', 
        'uvodniStranaZobrazitObjekt', 'uvodniStranaZobrazitVyhodnoceni', 'uvodniStranaZobrazitPodpisy',
        'uvodniStranaNadpisRamecek', 'uvodniStranaRamecekUdaje', 'uvodniStranaRamecekObjekt', 
        'uvodniStranaRamecekVyhodnoceni', 'zapatiZobrazitCisloStranky', 'zapatiZobrazitDatum'];
      
      for (const field of booleanFields) {
        if (field in data) {
          data[field] = data[field] ? 1 : 0;
        }
      }
      
      if (data.sekce) data.sekce = JSON.stringify(data.sekce);
      if (data.sloupceOkruhu) data.sloupceOkruhu = JSON.stringify(data.sloupceOkruhu);
      if (data.uvodniStranaBloky) data.uvodniStranaBloky = JSON.stringify(data.uvodniStranaBloky);
      
      // Pokud je tato šablona výchozí, odebrat příznak z ostatních
      if (data.jeVychozi === 1) {
        await pool.query('UPDATE sablona SET "jeVychozi" = 0 WHERE "jeVychozi" = 1 AND id != $1', [req.params.id]);
      }
      
      const keys = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = keys.map((k, i) => `"${k}" = $${i + 1}`).join(', ');
      await pool.query(`UPDATE sablona SET ${setClause} WHERE id = $${keys.length + 1}`, [...values, req.params.id]);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating sablona:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete('/api/sablony/:id', authMiddleware, async (req, res) => {
    try {
      await pool.query('DELETE FROM sablona WHERE id = $1', [req.params.id]);
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

  app.put('/api/nastaveni', authMiddleware, async (req, res) => {
    try {
      const now = new Date().toISOString();
      const existing = await pool.query('SELECT id FROM nastaveni LIMIT 1');
      
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

  // ==================== BACKUP ====================
  app.get('/api/backup', authMiddleware, async (req, res) => {
    try {
      const tables = [
        'revize', 'rozvadec', 'okruh', 'zavada', 'mistnost', 'zarizeni',
        'zakazka', 'mericiPristroj', 'revizePristroj', 'firma', 'nastaveni', 'sablona', 'zavadaKatalog', 'zakaznik'
      ];
      
      const backup: Record<string, any> = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
      };
      
      for (const table of tables) {
        const result = await pool.query(`SELECT * FROM "${table}"`);
        backup[table] = result.rows;
      }
      
      res.json(backup);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/backup/import', authMiddleware, async (req, res) => {
    try {
      const { data, mode } = req.body;
      
      if (mode === 'replace') {
        const tables = [
          'revizePristroj', 'zarizeni', 'zavada', 'okruh', 'zakazka',
          'rozvadec', 'mistnost', 'revize', 'sablona', 'firma', 
          'mericiPristroj', 'nastaveni', 'zavadaKatalog', 'zakaznik'
        ];
        for (const table of tables) {
          await pool.query(`DELETE FROM "${table}"`);
        }
      }
      
      // Pořadí importu - nejdřív nezávislé tabulky, pak závislé
      const importOrder = [
        'nastaveni', 'firma', 'zakaznik', 'mericiPristroj', 'sablona', 'zavadaKatalog',
        'revize', 'mistnost', 'rozvadec', 'zakazka',
        'okruh', 'zavada', 'zarizeni', 'revizePristroj'
      ];
      
      const skipKeys = ['version', 'timestamp'];
      
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
          } catch (e) {
            console.error(`Import error for ${table}:`, e);
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
          } catch (e) {
            console.error(`Import error for ${table}:`, e);
          }
        }
      }
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
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
    console.log(`🌐 CORS povolena pro: ${CORS_ORIGIN}\n`);
  });
}

startServer().catch(console.error);
