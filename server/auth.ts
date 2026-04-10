import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { pool } from './database';

const SESSION_TTL_MS = 60 * 60 * 1000; // 1 hodina neaktivity

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
  sessionId?: string;
}

// Hashovat heslo
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Ověřit heslo
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Vytvořit session v DB a vrátit session ID
export async function createSession(userId: number, username: string, email: string): Promise<string> {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await pool.query(
    `INSERT INTO sessions (id, user_id, username, email, expires_at) VALUES ($1, $2, $3, $4, $5)`,
    [id, userId, username, email, expiresAt]
  );
  return id;
}

// Smazat session (logout)
export async function logoutSession(sessionId: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
}

// Middleware pro ověření session
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const sessionId = req.headers.authorization?.replace('Bearer ', '');

  if (!sessionId) {
    res.status(401).json({ error: 'Chybí autentizační token' });
    return;
  }

  try {
    const result = await pool.query(
      `SELECT id, user_id, username, email, expires_at FROM sessions WHERE id = $1`,
      [sessionId]
    );

    if (result.rows.length === 0) {
      res.status(401).json({ error: 'Neplatná nebo vypršená session' });
      return;
    }

    const session = result.rows[0];

    if (new Date(session.expires_at) < new Date()) {
      // Session expirovala — smazat a odmítnout
      await pool.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
      res.status(401).json({ error: 'Session vypršela, přihlaste se znovu' });
      return;
    }

    // Prodloužit session o 1 hodinu (klouzavá expira)
    const newExpiry = new Date(Date.now() + SESSION_TTL_MS);
    await pool.query(
      `UPDATE sessions SET expires_at = $1, last_activity = NOW() WHERE id = $2`,
      [newExpiry, sessionId]
    );

    req.user = { id: session.user_id, username: session.username, email: session.email };
    req.sessionId = sessionId;
    next();
  } catch (error) {
    console.error('authMiddleware error:', error);
    res.status(500).json({ error: 'Chyba serveru při ověřování' });
  }
}

// Registrace uživatele
export async function registerUser(data: { username: string; email: string; password: string; jmeno?: string }): Promise<{ id: number; username: string; email: string }> {
  const { username, email, password, jmeno = '' } = data;
  
  // Zkontrolovat, zda uživatel již neexistuje
  const existingUser = await pool.query(
    'SELECT id FROM users WHERE username = $1 OR email = $2',
    [username, email]
  );
  
  if (existingUser.rows.length > 0) {
    throw new Error('Uživatel se stejným jménem nebo emailem již existuje');
  }

  const hashedPassword = await hashPassword(password);
  const now = new Date().toISOString();

  const result = await pool.query(`
    INSERT INTO users (username, password, email, jmeno, "createdAt", "updatedAt")
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id
  `, [username, hashedPassword, email, jmeno, now, now]);

  return {
    id: result.rows[0].id,
    username,
    email
  };
}

// Ověřit přihlášení
export async function loginUser(username: string, password: string): Promise<{ token: string; user: { id: number; username: string; email: string } }> {
  const result = await pool.query(
    'SELECT id, username, email, password FROM users WHERE username = $1',
    [username]
  );
  
  const user = result.rows[0];

  if (!user) {
    throw new Error('Uživatel neexistuje');
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new Error('Nesprávné heslo');
  }

  const sessionId = await createSession(user.id, user.username, user.email);

  return {
    token: sessionId,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  };
}
