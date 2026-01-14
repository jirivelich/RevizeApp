import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import db from './database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// Hashovat heslo
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// Ověřit heslo
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Vytvořit JWT token
export function createToken(userId: number, username: string, email: string): string {
  return jwt.sign(
    { id: userId, username, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware pro ověření tokenu
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Chybí autentizační token' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Neplatný nebo vypršený token' });
  }
}

// Registrace uživatele
export async function registerUser(username: string, email: string, password: string, jmeno: string = ''): Promise<{ id: number; username: string; email: string }> {
  // Zkontrolovat, zda uživatel již neexistuje
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existingUser) {
    throw new Error('Uživatel se stejným jménem nebo emailem již existuje');
  }

  const hashedPassword = await hashPassword(password);
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO users (username, password, email, jmeno, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, hashedPassword, email, jmeno, now, now);

  return {
    id: result.lastInsertRowid as number,
    username,
    email
  };
}

// Ověřit přihlášení
export async function loginUser(username: string, password: string): Promise<{ token: string; user: { id: number; username: string; email: string } }> {
  const user = db.prepare('SELECT id, username, email, password FROM users WHERE username = ?').get(username) as any;

  if (!user) {
    throw new Error('Uživatel neexistuje');
  }

  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    throw new Error('Nesprávné heslo');
  }

  const token = createToken(user.id, user.username, user.email);

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email
    }
  };
}
