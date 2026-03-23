'use client';
import { useState, useEffect, useRef } from 'react';
import { useTradeStore } from '@/lib/store';
import { formatPrice, formatPercent } from '@/lib/formatters';
import { useStockQuote } from '@/hooks/useStockQuote';
import { SearchResult } from '@/types/stock';
import { getSession, logout } from '@/lib/auth';

function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const { setActiveSymbol, addToWatchlist } = useTradeStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setOpen(false); return; }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/stock/search?q=${encodeURIComponent(query)}`);
        const data = await r.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch { setResults([]); } finally { setLoading(false); }
    }, 250);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(r: SearchResult) {
    setActiveSymbol(r.symbol);
    addToWatchlist({ symbol: r.symbol, name: r.shortname, addedAt: Date.now() });
    setQuery(''); setOpen(false); inputRef.current?.blur();
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: focused ? 'var(--bg-elevated)' : 'var(--bg-hover)',
        border: `1px solid ${focused ? 'var(--border-bright)' : 'var(--border)'}`,
        borderRadius: '8px', padding: '6px 12px', transition: 'all 0.15s',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Rechercher un titre... (⌘K)"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: '12px', flex: 1, minWidth: 0,
          }}
        />
        {loading
          ? <div className="spinner" style={{ width: '12px', height: '12px', flexShrink: 0 }} />
          : query
            ? <button onClick={() => { setQuery(''); setOpen(false); }} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px' }}>×</button>
            : <kbd style={{ fontSize: '9px', color: 'var(--text-muted)', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '3px', padding: '1px 5px', flexShrink: 0 }}>⌘K</kbd>
        }
      </div>

      {open && results.length > 0 && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
          borderRadius: '8px', zIndex: 100, overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
        }}>
          <div style={{ padding: '6px 12px 4px', fontSize: '10px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>
            Résultats pour &ldquo;{query}&rdquo;
          </div>
          {results.slice(0, 6).map((r) => (
            <button key={r.symbol} onClick={() => select(r)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 12px', background: 'transparent', border: 'none', cursor: 'pointer',
              borderBottom: '1px solid var(--border)', transition: 'background 0.1s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-primary)' }}>{r.symbol}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>{r.shortname}</div>
              </div>
              <span style={{
                fontSize: '10px', padding: '2px 6px', background: 'var(--bg-hover)',
                borderRadius: '4px', color: 'var(--text-muted)', border: '1px solid var(--border)',
              }}>{r.exchDisp || r.typeDisp}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Account Menu ─────────────────────────────────────────────────────────────
function AccountMenu({ onLogout }: { onLogout?: () => void }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { setAiPanelOpen, setAiPanelTab } = useTradeStore();
  const session = getSession();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!session) return null;

  // Build initials from name
  const words = session.name.trim().split(/\s+/);
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : session.name.slice(0, 2).toUpperCase();

  const btnBase: React.CSSProperties = {
    width: '100%', textAlign: 'left', padding: '7px 10px',
    borderRadius: '6px', border: 'none', background: 'transparent',
    fontSize: '12px', cursor: 'pointer', display: 'block',
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      {/* Avatar */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.4)',
          color: 'var(--accent)', fontSize: '11px', fontWeight: '700',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, transition: 'border-color 0.12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(96,165,250,0.4)'; }}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="animate-fade-in" style={{
          position: 'absolute', top: '40px', right: 0, zIndex: 200,
          background: 'var(--bg-elevated)', border: '1px solid var(--border-bright)',
          borderRadius: '10px', minWidth: '210px',
          boxShadow: '0 16px 40px rgba(0,0,0,0.6)', overflow: 'hidden',
        }}>
          {/* User info */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>{session.name}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{session.email}</div>
          </div>
          {/* Actions */}
          <div style={{ padding: '6px' }}>
            <button
              onClick={() => { setAiPanelOpen(true); setAiPanelTab('perso'); setOpen(false); }}
              style={{ ...btnBase, color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              Profil IA
            </button>
            <button
              onClick={() => { logout(); onLogout?.(); setOpen(false); }}
              style={{ ...btnBase, color: 'var(--red)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────
export default function TopBar({ onLogout }: { onLogout?: () => void }) {
  const activeSymbol = useTradeStore((s) => s.activeSymbol);
  const { quote } = useStockQuote(activeSymbol);
  const isUp = (quote?.changePercent ?? 0) >= 0;

  return (
    <div style={{
      background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)',
      height: '52px', display: 'flex', alignItems: 'center',
      padding: '0 16px', gap: '16px', flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <div style={{
          width: '26px', height: '26px', background: 'var(--bg-elevated)',
          border: '1px solid var(--border-bright)', borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '11px', fontWeight: '700', color: 'var(--accent)',
          letterSpacing: '-0.5px',
        }}>T</div>
        <span style={{ fontWeight: '600', fontSize: '14px', letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
          TradeAI
        </span>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border)', flexShrink: 0 }} />

      {/* Active symbol — compact */}
      {quote && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{activeSymbol}</span>
          <span style={{ fontSize: '16px', fontWeight: '600', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>
            ${formatPrice(quote.price)}
          </span>
          <span style={{ fontSize: '12px', fontWeight: '500', color: isUp ? 'var(--green)' : 'var(--red)' }}>
            {isUp ? '+' : ''}{formatPercent(quote.changePercent)}
          </span>
        </div>
      )}

      {/* Centered search */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <GlobalSearch />
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Live</span>
        </div>
        <div style={{
          padding: '4px 10px', background: 'var(--bg-elevated)',
          border: '1px solid var(--border-bright)', borderRadius: '20px',
          fontSize: '11px', color: 'var(--text-secondary)',
        }}>
          IA Active
        </div>
        <AccountMenu onLogout={onLogout} />
      </div>
    </div>
  );
}
