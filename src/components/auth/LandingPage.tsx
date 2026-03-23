'use client';
import { useState, FormEvent } from 'react';
import { createAccount, login, AppSession } from '@/lib/auth';

interface LandingPageProps {
  onSuccess: (session: AppSession) => void;
}

const FEATURES = [
  { label: 'Graphiques temps réel', sub: 'Bougies japonaises, indicateurs techniques, multi-charts' },
  { label: 'GS TradeAI — Analyste IA', sub: 'Goldman Sachs style : scénarios pondérés, setup opérationnel' },
  { label: 'Heatmap S&P 500 & Options Flow', sub: 'Visualisation sectorielle par capitalisation boursière' },
  { label: 'Paper Trading & Backtesting', sub: 'Portfolio virtuel 100k$, simulation de stratégies MA' },
];

export default function LandingPage({ onSuccess }: LandingPageProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function switchMode(m: 'login' | 'signup') {
    setMode(m);
    setError('');
    setName(''); setEmail(''); setPassword('');
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await login(email, password)
        : await createAccount(name, email, password);
      if (result.ok) {
        onSuccess(result.session);
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'var(--bg-elevated)', border: '1px solid var(--border)',
    borderRadius: '8px', color: 'var(--text-primary)', fontSize: '13px',
    outline: 'none', boxSizing: 'border-box', marginBottom: '10px',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)', overflow: 'hidden' }}>

      {/* ── Left panel — branding ──────────────────────────────────────────── */}
      <div style={{
        width: '55%', display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '60px 72px', position: 'relative', overflow: 'hidden',
        borderRight: '1px solid var(--border)',
      }}>
        {/* Gradient accent */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0, width: '500px', height: '500px',
          background: 'radial-gradient(circle at 100% 100%, rgba(96,165,250,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '300px', height: '300px',
          background: 'radial-gradient(circle at 0% 0%, rgba(96,165,250,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '52px' }}>
          <div style={{
            width: '36px', height: '36px', background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)', borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '15px', fontWeight: '800', color: 'var(--accent)', letterSpacing: '-0.5px',
          }}>T</div>
          <span style={{ fontWeight: '700', fontSize: '20px', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
            TradeAI
          </span>
        </div>

        {/* Hero */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '38px', fontWeight: '800', lineHeight: 1.15,
            letterSpacing: '-1.5px', color: 'var(--text-primary)', margin: 0, marginBottom: '14px',
          }}>
            Le terminal de trading<br />
            <span style={{ color: 'var(--accent)' }}>alimenté par l&apos;IA</span>
          </h1>
          <p style={{ fontSize: '15px', color: 'var(--text-muted)', lineHeight: 1.6, margin: 0, maxWidth: '440px' }}>
            Analyse technique, macro et sentiment en temps réel.
            GS TradeAI intégré — comme avoir un analyste Goldman Sachs à portée de main.
          </p>
        </div>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                background: 'var(--accent)', marginTop: '6px',
              }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>
                  {f.label}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {f.sub}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: '52px', fontSize: '10px', color: 'var(--text-muted)' }}>
          Données en quasi-temps réel · ~15s de délai · Yahoo Finance
        </div>
      </div>

      {/* ── Right panel — auth form ────────────────────────────────────────── */}
      <div style={{
        width: '45%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px',
      }}>
        <div style={{
          width: '360px',
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: '14px', padding: '28px',
        }}>
          {/* Mode toggle */}
          <div style={{
            display: 'flex', background: 'var(--bg-elevated)',
            borderRadius: '9px', padding: '3px', marginBottom: '24px',
          }}>
            {(['login', 'signup'] as const).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: '7px', border: 'none',
                  cursor: 'pointer', fontSize: '12px', fontWeight: mode === m ? 600 : 400,
                  background: mode === m ? 'var(--bg-hover)' : 'transparent',
                  color: mode === m ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {m === 'login' ? 'Connexion' : 'Créer un compte'}
              </button>
            ))}
          </div>

          {/* Title */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {mode === 'login' ? 'Bon retour 👋' : 'Créer votre compte'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {mode === 'login'
                ? 'Connectez-vous pour accéder à votre terminal'
                : 'Gratuit, aucune carte bancaire requise'}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nom complet"
                required
                style={inputStyle}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-bright)'; }}
                onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              style={inputStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-bright)'; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mot de passe"
              required
              minLength={6}
              style={{ ...inputStyle, marginBottom: '16px' }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border-bright)'; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'var(--border)'; }}
            />

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: '7px', padding: '10px 12px', fontSize: '12px',
                color: 'var(--red)', marginBottom: '14px', lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', borderRadius: '8px', border: 'none',
                background: loading ? 'var(--bg-elevated)' : 'var(--accent)',
                color: '#fff', fontWeight: '700', fontSize: '13px',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'opacity 0.15s',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading && <div className="spinner" style={{ width: '14px', height: '14px' }} />}
              {loading ? 'Chargement…' : (mode === 'login' ? 'Se connecter' : 'Créer mon compte')}
            </button>
          </form>

          {/* Switch mode link */}
          <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
            {mode === 'login' ? 'Pas encore de compte ? ' : 'Déjà un compte ? '}
            <button
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
              style={{
                background: 'none', border: 'none', color: 'var(--accent)',
                cursor: 'pointer', fontSize: '11px', fontWeight: '600',
              }}
            >
              {mode === 'login' ? 'Créer un compte' : 'Se connecter'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
