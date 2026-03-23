// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: number;
}

export interface AppSession {
  userId: string;
  name: string;
  email: string;
  expiresAt: number;
}

type AuthSuccess = { ok: true; session: AppSession };
type AuthError   = { ok: false; error: string };

// ─── Internal helpers ────────────────────────────────────────────────────────

async function hashPassword(email: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(email.toLowerCase() + ':' + password);
  const buf  = await window.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getAccounts(): AppUser[] {
  if (typeof window === 'undefined') return [];
  try { const v = localStorage.getItem('app_accounts'); return v ? JSON.parse(v) : []; } catch { return []; }
}

function setAccounts(users: AppUser[]): void {
  localStorage.setItem('app_accounts', JSON.stringify(users));
}

function setSession(session: AppSession): void {
  localStorage.setItem('app_session', JSON.stringify(session));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getSession(): AppSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const v = localStorage.getItem('app_session');
    if (!v) return null;
    const session: AppSession = JSON.parse(v);
    if (session.expiresAt <= Date.now()) {
      logout();
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function logout(): void {
  if (typeof window !== 'undefined') localStorage.removeItem('app_session');
}

export async function createAccount(
  name: string,
  email: string,
  password: string,
): Promise<AuthSuccess | AuthError> {
  // Validation
  if (!name.trim()) return { ok: false, error: 'Le nom est requis' };
  if (!email.includes('@')) return { ok: false, error: 'Email invalide' };
  if (password.length < 6) return { ok: false, error: 'Mot de passe trop court (6 caractères minimum)' };

  const accounts = getAccounts();
  if (accounts.find((u) => u.email === email.toLowerCase())) {
    return { ok: false, error: 'Un compte avec cet email existe déjà' };
  }

  const passwordHash = await hashPassword(email, password);
  const newUser: AppUser = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
    createdAt: Date.now(),
  };

  setAccounts([...accounts, newUser]);

  const session: AppSession = {
    userId: newUser.id,
    name: newUser.name,
    email: newUser.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  setSession(session);

  return { ok: true, session };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthSuccess | AuthError> {
  const accounts = getAccounts();
  const user = accounts.find((u) => u.email === email.toLowerCase());
  if (!user) return { ok: false, error: 'Compte introuvable' };

  const hash = await hashPassword(email, password);
  if (hash !== user.passwordHash) return { ok: false, error: 'Mot de passe incorrect' };

  const session: AppSession = {
    userId: user.id,
    name: user.name,
    email: user.email,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  setSession(session);

  return { ok: true, session };
}

/**
 * Returns the localStorage key namespaced by the current user.
 * Must be called at runtime (not module init) — reads session fresh each call.
 */
export function userKey(key: string): string {
  const session = getSession();
  return session ? `${session.userId}_${key}` : key;
}
