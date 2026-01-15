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
// Aplikovat autentizaci na všechny API endpointy kromě auth a health
app.use('/api/revize', authMiddleware);
app.use('/api/rozvadece', authMiddleware);
app.use('/api/okruhy', authMiddleware);
app.use('/api/zavady', authMiddleware);
app.use('/api/firmy', authMiddleware);
app.use('/api/mistnosti', authMiddleware);
app.use('/api/zarizeni', authMiddleware);
app.use('/api/zakazky', authMiddleware);
app.use('/api/pristroje', authMiddleware);
app.use('/api/sablony', authMiddleware);
app.use('/api/nastaveni', authMiddleware);
app.use('/api/zavady-katalog', authMiddleware);
app.use('/api/backup', authMiddleware);

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

app.put('/api/rozvadece/:id', (req, res) => {
  try {
    const now = new Date().toISOString();
    const updates = { ...req.body, updatedAt: now };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    const query = `UPDATE rozvadec SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== OKRUHY ====================
app.get('/api/okruhy/:rozvadecId', (req, res) => {
  try {
    const okruhy = db.prepare('SELECT * FROM okruh WHERE rozvadecId = ? ORDER BY cislo').all(req.params.rozvadecId);
    res.json(okruhy);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/okruhy', (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO okruh (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/okruhy/:id', (req, res) => {
  try {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    
    const query = `UPDATE okruh SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/okruhy/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM okruh WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== MISTNOSTI ====================
app.get('/api/mistnosti', (req, res) => {
  try {
    const mistnosti = db.prepare('SELECT * FROM mistnost').all();
    res.json(mistnosti);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/mistnosti/revize/:revizeId', (req, res) => {
  try {
    const mistnosti = db.prepare('SELECT * FROM mistnost WHERE revizeId = ?').all(req.params.revizeId);
    res.json(mistnosti);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/mistnosti', (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO mistnost (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/mistnosti/:id', (req, res) => {
  try {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    
    const query = `UPDATE mistnost SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/mistnosti/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM mistnost WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== ZARIZENI ====================
app.get('/api/zarizeni/:mistnostId', (req, res) => {
  try {
    const zarizeni = db.prepare('SELECT * FROM zarizeni WHERE mistnostId = ?').all(req.params.mistnostId);
    res.json(zarizeni);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/zarizeni', (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO zarizeni (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/zarizeni/:id', (req, res) => {
  try {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    
    const query = `UPDATE zarizeni SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/zarizeni/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM zarizeni WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== ZAVADY ====================
app.get('/api/zavady', (req, res) => {
  try {
    const zavady = db.prepare('SELECT * FROM zavada').all();
    res.json(zavady);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/zavady/revize/:revizeId', (req, res) => {
  try {
    const zavady = db.prepare('SELECT * FROM zavada WHERE revizeId = ?').all(req.params.revizeId);
    res.json(zavady);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/zavady', (req, res) => {
  try {
    const data = req.body;
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO zavada (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/zavady/:id', (req, res) => {
  try {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    
    const query = `UPDATE zavada SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/zavady/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM zavada WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== FIRMY ====================
app.get('/api/firmy', (req, res) => {
  try {
    const firmy = db.prepare('SELECT * FROM firma').all();
    res.json(firmy);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/firmy/:id', (req, res) => {
  try {
    const firma = db.prepare('SELECT * FROM firma WHERE id = ?').get(req.params.id);
    if (!firma) return res.status(404).json({ error: 'Firma nebyla nalezena' });
    res.json(firma);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/firmy', (req, res) => {
  try {
    const now = new Date().toISOString();
    const data = { ...req.body, createdAt: now, updatedAt: now };
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO firma (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/firmy/:id', (req, res) => {
  try {
    const now = new Date().toISOString();
    const updates = { ...req.body, updatedAt: now };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    const query = `UPDATE firma SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/firmy/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM firma WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== ZAKAZKY ====================
app.get('/api/zakazky', (req, res) => {
  try {
    const zakazky = db.prepare('SELECT * FROM zakazka ORDER BY datumPlanovany').all();
    res.json(zakazky);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/zakazky', (req, res) => {
  try {
    const now = new Date().toISOString();
    const data = { ...req.body, createdAt: now, updatedAt: now };
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO zakazka (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/zakazky/:id', (req, res) => {
  try {
    const now = new Date().toISOString();
    const updates = { ...req.body, updatedAt: now };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    const query = `UPDATE zakazka SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/zakazky/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM zakazka WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== MERICI PRISTROJE ====================
app.get('/api/pristroje', (req, res) => {
  try {
    const pristroje = db.prepare('SELECT * FROM mericiPristroj').all();
    res.json(pristroje);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/pristroje/:id', (req, res) => {
  try {
    const pristroj = db.prepare('SELECT * FROM mericiPristroj WHERE id = ?').get(req.params.id);
    if (!pristroj) return res.status(404).json({ error: 'Přístroj nebyl nalezen' });
    res.json(pristroj);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/pristroje', (req, res) => {
  try {
    const now = new Date().toISOString();
    const data = { ...req.body, createdAt: now, updatedAt: now };
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO mericiPristroj (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/pristroje/:id', (req, res) => {
  try {
    const now = new Date().toISOString();
    const updates = { ...req.body, updatedAt: now };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    const query = `UPDATE mericiPristroj SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/pristroje/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM mericiPristroj WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== REVIZE-PRISTROJ (vazby) ====================
app.get('/api/revize-pristroje/:revizeId', (req, res) => {
  try {
    const vazby = db.prepare(`
      SELECT rp.*, mp.nazev, mp.vyrobce, mp.model, mp.vyrobniCislo 
      FROM revizePristroj rp 
      JOIN mericiPristroj mp ON rp.pristrojId = mp.id 
      WHERE rp.revizeId = ?
    `).all(req.params.revizeId);
    res.json(vazby);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/revize-pristroje', (req, res) => {
  try {
    const { revizeId, pristrojId } = req.body;
    
    const result = db.prepare(`
      INSERT INTO revizePristroj (revizeId, pristrojId) VALUES (?, ?)
    `).run(revizeId, pristrojId);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/revize-pristroje/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM revizePristroj WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== SABLONY ====================
app.get('/api/sablony', (req, res) => {
  try {
    const sablony = db.prepare('SELECT * FROM sablona').all();
    res.json(sablony);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/sablony/:id', (req, res) => {
  try {
    const sablona = db.prepare('SELECT * FROM sablona WHERE id = ?').get(req.params.id);
    if (!sablona) return res.status(404).json({ error: 'Šablona nebyla nalezena' });
    res.json(sablona);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/sablony/vychozi/get', (req, res) => {
  try {
    const sablona = db.prepare('SELECT * FROM sablona WHERE jeVychozi = 1').get();
    res.json(sablona || null);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/sablony', (req, res) => {
  try {
    const now = new Date().toISOString();
    const data = { ...req.body, createdAt: now, updatedAt: now };
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO sablona (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/sablony/:id', (req, res) => {
  try {
    const now = new Date().toISOString();
    const updates = { ...req.body, updatedAt: now };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    const query = `UPDATE sablona SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/sablony/:id/vychozi', (req, res) => {
  try {
    // Nejprve zrušit výchozí u všech
    db.prepare('UPDATE sablona SET jeVychozi = 0').run();
    // Nastavit jako výchozí vybranou
    db.prepare('UPDATE sablona SET jeVychozi = 1 WHERE id = ?').run(req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/sablony/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM sablona WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ==================== ZAVADY KATALOG ====================
app.get('/api/zavady-katalog', (req, res) => {
  try {
    const katalog = db.prepare('SELECT * FROM zavadaKatalog').all();
    res.json(katalog);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.post('/api/zavady-katalog', (req, res) => {
  try {
    const now = new Date().toISOString();
    const data = { ...req.body, createdAt: now, updatedAt: now };
    const keys = Object.keys(data);
    const values = Object.values(data);
    
    const result = db.prepare(`
      INSERT INTO zavadaKatalog (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})
    `).run(...values);
    
    res.json({ id: result.lastInsertRowid });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.put('/api/zavady-katalog/:id', (req, res) => {
  try {
    const now = new Date().toISOString();
    const updates = { ...req.body, updatedAt: now };
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    
    const query = `UPDATE zavadaKatalog SET ${keys.map(k => `${k} = ?`).join(', ')} WHERE id = ?`;
    db.prepare(query).run(...values, req.params.id);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.delete('/api/zavady-katalog/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM zavadaKatalog WHERE id = ?').run(req.params.id);
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

