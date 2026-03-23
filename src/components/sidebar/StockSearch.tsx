'use client';
import { useState, useEffect, useRef } from 'react';
import { SearchResult } from '@/types/stock';
import { useTradeStore } from '@/lib/store';

export default function StockSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { setActiveSymbol, addToWatchlist } = useTradeStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

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
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(result: SearchResult) {
    setActiveSymbol(result.symbol);
    addToWatchlist({ symbol: result.symbol, name: result.shortname, addedAt: Date.now() });
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', padding: '10px 12px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '7px 10px',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher un titre..."
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-primary)',
            fontSize: '12px',
            flex: 1,
            minWidth: 0,
          }}
        />
        {loading && <div className="spinner" />}
      </div>

      {open && results.length > 0 && (
        <div
          className="animate-fade-in"
          style={{
            position: 'absolute',
            top: 'calc(100% - 2px)',
            left: '12px',
            right: '12px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            borderRadius: '6px',
            zIndex: 50,
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {results.map((r) => (
            <button
              key={r.symbol}
              onClick={() => select(r)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-primary)' }}>
                  {r.symbol}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                  {r.shortname}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: '10px',
                    padding: '2px 5px',
                    background: 'var(--bg-hover)',
                    borderRadius: '3px',
                    color: 'var(--text-muted)',
                  }}
                >
                  {r.exchDisp || r.typeDisp}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
