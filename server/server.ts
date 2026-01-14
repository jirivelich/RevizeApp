import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import db, { initializeDatabase } from './database';
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
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('/', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Inicializovat databázi
try {
  initializeDatabase();
  console.log('✅ Databáze inicializována');
} catch (error) {
  console.error('❌ Chyba při inicializaci databáze:', error);
  process.exit(1);
}

// Vytvořit data direktorium
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// ==================== HEALTH CHECK ====================
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'RevizeApp Server je spuštěný' });
});

// ==================== AUTHENTICATION ====================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, jmeno } = req.body;
    
    if (!username || !email || !password) {
      res.status(400).json({ error: 'Vyplňte všechna povinná pole' });
      return;
    }
    
    const user = await registerUser(username, email, password, jmeno);
    res.status(201).json({ success: true, user });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ error: 'Vyplňte uživatelské jméno a heslo' });
      return;
    }
    
    const result = await loginUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

app.post('/api/auth/verify', authMiddleware, (req: AuthRequest, res) => {
  try {
    // Middleware již ověřil token a nastavil req.user
    res.json({ valid: true, user: req.user });
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
});

// ==================== PROTECTED ROUTES ====================
// Aplikovat autentizaci na všechny API endpointy kromě auth
app.use('/api/revize', authMiddleware);
app.use('/api/rozvadec', authMiddleware);
app.use('/api/okruh', authMiddleware);
app.use('/api/zavada', authMiddleware);
app.use('/api/firma', authMiddleware);
app.use('/api/mistnost', authMiddleware);
app.use('/api/metodologie', authMiddleware);
app.use('/api/sablona', authMiddleware);

// ==================== REVIZE ====================
app.get('/api/revize', (req, res) => {
  try {
    const revize = db.prepare('SELECT * FROM revize ORDER BY datum DESC').all();
    res.json(revize);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/revize/:id', (req, res) => {
  try {
    const revize = db.prepare('SELECT * FROM revize WHERE id = ?').get(req.params.id);
    if (!revize) return res.status(404).json({ error: 'Revize nebyla nalezena' });
    res.json(revize);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/revize', (req, res) => {
  try {
    const { cisloRevize, nazev, adresa, objednatel, datum, termin, typRevize, stav } = req.body;
    const now = new Date().toISOString();
    
    const result = db.prepare(`
      INSERT INTO revize (cisloRevize, nazev, adresa, objednatel, datum, termin, typRevize, stav, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cisloRevize, nazev, adresa, objednatel, datum, termin, typRevize, stav, now, now);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/revize/:id', (req, res) => {
  try {
    const now = new Date().toISOString();
    const updates = { ...req.body, updatedAt: now };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    const query = `UPDATE revize SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/revize/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM revize WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== ROZVADĚČE ====================
app.get('/api/rozvadece/:revizeId', (req, res) => {
  try {
    const rozvadece = db.prepare('SELECT * FROM rozvadec WHERE revizeId = ?').all(req.params.revizeId);
    res.json(rozvadece);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/rozvadece', (req, res) => {
  try {
    const { revizeId, nazev, oznaceni, umisteni, typRozvadece, stupenKryti } = req.body;
    const now = new Date().toISOString();
    
    const result = db.prepare(`
      INSERT INTO rozvadec (revizeId, nazev, oznaceni, umisteni, typRozvadece, stupenKryti, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(revizeId, nazev, oznaceni, umisteni, typRozvadece, stupenKryti, now, now);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/rozvadece/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM rozvadec WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== NASTAVENÍ ====================
app.get('/api/nastaveni', (req, res) => {
  try {
    const nastaveni = db.prepare('SELECT * FROM nastaveni LIMIT 1').get();
    res.json(nastaveni || {});
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/nastaveni', (req, res) => {
  try {
    const existing = db.prepare('SELECT id FROM nastaveni LIMIT 1').get();
    const now = new Date().toISOString();
    
    if (existing) {
      const updates = { ...req.body, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const query = `UPDATE nastaveni SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
      db.prepare(query).run(...values, (existing as any).id);
    } else {
      const updates = { ...req.body, createdAt: now, updatedAt: now };
      const keys = Object.keys(updates);
      const values = Object.values(updates);
      
      const query = `INSERT INTO nastaveni (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`;
      db.prepare(query).run(...values);
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== BACKUP ====================
app.get('/api/backup', (req, res) => {
  try {
    const tables = [
      'revize', 'rozvadec', 'okruh', 'zavada', 'mistnost', 'zarizeni',
      'zakazka', 'mericiPristroj', 'revizePristroj', 'firma', 'nastaveni', 'sablona'
    ];
    
    const backup: Record<string, any> = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    };
    
    for (const table of tables) {
      backup[table] = db.prepare(`SELECT * FROM ${table}`).all();
    }
    
    res.json(backup);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/backup/import', (req, res) => {
  try {
    const { data, mode } = req.body;
    
    if (mode === 'replace') {
      // Smazat všechna data
      const tables = [
        'revizePristroj', 'zarizeni', 'zavada', 'okruh', 'zakazka',
        'rozvadec', 'mistnost', 'revize', 'sablona', 'firma', 
        'mericiPristroj', 'nastaveni'
      ];
      for (const table of tables) {
        db.prepare(`DELETE FROM ${table}`).run();
      }
    }
    
    // Importovat data
    for (const [table, records] of Object.entries(data)) {
      if (!Array.isArray(records) || records.length === 0) continue;
      
      const cols = Object.keys(records[0]);
      const placeholders = cols.map(() => '?').join(', ');
      const query = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
      const stmt = db.prepare(query);
      
      for (const record of records) {
        stmt.run(...cols.map(col => record[col]));
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== ERROR HANDLING ====================
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Interní chyba serveru' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 RevizeApp Server běží na http://localhost:${PORT}`);
  console.log(`📊 Zdravotní kontrola: http://localhost:${PORT}/api/health`);
  console.log(`💾 Databáze: ${path.join(__dirname, 'data/revizeapp.db')}`);
  console.log(`🌐 CORS povolena pro: ${CORS_ORIGIN}\n`);
});

