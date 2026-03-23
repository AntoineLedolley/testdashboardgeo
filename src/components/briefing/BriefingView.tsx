'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { userKey } from '@/lib/auth';

interface BriefingEntry {
  id: string;
  content: string;
  timestamp: number;
  dateLabel: string;
}

// Keys are functions so userKey() is called at runtime, not module init
const STORAGE_KEY_CURRENT = () => userKey('briefing_current');
const STORAGE_KEY_HISTORY = () => userKey('briefing_history');
const MAX_HISTORY = 10;

function loadCurrent(): BriefingEntry | null {
  if (typeof window === 'undefined') return null;
  try { const v = localStorage.getItem(STORAGE_KEY_CURRENT()); return v ? JSON.parse(v) : null; } catch { return null; }
}
function saveCurrent(entry: BriefingEntry) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_CURRENT(), JSON.stringify(entry));
}
function loadHistory(): BriefingEntry[] {
  if (typeof window === 'undefined') return [];
  try { const v = localStorage.getItem(STORAGE_KEY_HISTORY()); return v ? JSON.parse(v) : []; } catch { return []; }
}
function saveHistory(entries: BriefingEntry[]) {
  if (typeof window !== 'undefined') localStorage.setItem(STORAGE_KEY_HISTORY(), JSON.stringify(entries));
}

function renderMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(59,130,246,0.15);padding:1px 5px;border-radius:3px;font-size:11px;font-family:monospace">$1</code>')
    .replace(/^- (.+)/gm, '<li style="margin-left:12px;margin-bottom:2px">$1</li>')
    .replace(/^#{1,3} (.+)/gm, '<div style="font-weight:700;margin-bottom:6px;color:var(--accent)">$1</div>')
    .replace(/\n/g, '<br/>');
}

function isSameDay(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export default function BriefingView() {
  const [current, setCurrent] = useState<BriefingEntry | null>(null);
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<BriefingEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingEntry, setViewingEntry] = useState<BriefingEntry | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const generate = useCallback(async () => {
    // Cancel any in-progress request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setError('');
    setStreaming('');
    setLoading(true);
    setViewingEntry(null);

    let accumulated = '';

    try {
      const res = await fetch('/api/briefing', { signal: controller.signal });

      if (!res.ok) {
        setError(`Erreur ${res.status} — impossible de générer le briefing`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError('Réponse invalide du serveur');
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreaming((prev) => prev + chunk);
      }

      if (!accumulated) {
        setError('Le briefing est vide — réessayez dans un instant');
        return;
      }

      // Persist completed briefing
      const now = Date.now();
      const dateLabel = new Date(now).toLocaleDateString('fr-FR', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      });
      const entry: BriefingEntry = { id: String(now), content: accumulated, timestamp: now, dateLabel };

      setCurrent(entry);
      setStreaming('');
      saveCurrent(entry);

      setHistory((prev) => {
        const updated = [entry, ...prev].slice(0, MAX_HISTORY);
        saveHistory(updated);
        return updated;
      });

    } catch (e: unknown) {
      if ((e as Error)?.name === 'AbortError') return;
      console.error('Briefing error:', e);
      setError('Échec de la génération — vérifiez votre connexion et réessayez');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load persisted data on mount; only regenerate if nothing from today
  useEffect(() => {
    const saved = loadCurrent();
    const hist = loadHistory();
    setHistory(hist);
    if (saved && isSameDay(saved.timestamp)) {
      setCurrent(saved);
    } else {
      generate();
    }
    return () => { abortRef.current?.abort(); };
  }, [generate]);

  const displayEntry = viewingEntry ?? current;
  const displayContent = loading ? streaming : (displayEntry?.content ?? '');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>☀️ Briefing Matinal IA</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {viewingEntry ? viewingEntry.dateLabel : today}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {history.length > 0 && (
              <button
                onClick={() => { setShowHistory((v) => !v); setViewingEntry(null); }}
                style={{
                  padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                  background: showHistory ? 'var(--bg-surface)' : 'transparent',
                  color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px',
                }}
              >
                📋 Historique ({history.length})
              </button>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
              <button
                onClick={generate}
                disabled={loading}
                style={{
                  padding: '5px 12px', borderRadius: '6px', border: '1px solid var(--accent)',
                  background: loading ? 'transparent' : 'var(--accent)22',
                  color: 'var(--accent)', cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: '11px', fontWeight: 600,
                }}
              >
                {loading ? '⟳ Génération…' : '↻ Actualiser'}
              </button>
              {current && !loading && (
                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                  Mis à jour à {new Date(current.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div style={{ borderBottom: '1px solid var(--border)', padding: '8px 16px', flexShrink: 0, maxHeight: '160px', overflowY: 'auto' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>Briefings précédents</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {history.map((entry) => (
              <button
                key={entry.id}
                onClick={() => { setViewingEntry(entry.id === viewingEntry?.id ? null : entry); setShowHistory(false); }}
                style={{
                  textAlign: 'left', padding: '6px 10px', borderRadius: '6px',
                  background: viewingEntry?.id === entry.id ? 'var(--accent)22' : 'var(--bg-surface)',
                  border: `1px solid ${viewingEntry?.id === entry.id ? 'var(--accent)' : 'transparent'}`,
                  color: 'var(--text-primary)', cursor: 'pointer', fontSize: '11px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}
              >
                <span>{entry.dateLabel}</span>
                {isSameDay(entry.timestamp) && (
                  <span style={{ fontSize: '9px', background: 'var(--accent)', color: '#000', borderRadius: '3px', padding: '1px 5px', fontWeight: 700 }}>AUJOURD&apos;HUI</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Viewing old entry banner */}
      {viewingEntry && (
        <div style={{ padding: '6px 20px', background: 'var(--accent)11', borderBottom: '1px solid var(--accent)33', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '11px', color: 'var(--accent)' }}>📋 Consultation d&apos;un ancien briefing</span>
          <button onClick={() => setViewingEntry(null)} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>← Retour au dernier</button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* Error */}
        {error && !loading && (
          <div style={{ background: 'rgba(255,77,106,0.1)', border: '1px solid rgba(255,77,106,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '12px', color: 'var(--red)' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Skeleton while waiting for first chunk */}
        {loading && !streaming && (
          <div>
            {[100, 80, 95, 60, 85, 70, 90].map((w, i) => (
              <div key={i} style={{ height: '12px', borderRadius: '4px', background: 'var(--bg-surface)', marginBottom: '8px', width: `${w}%`, animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        )}

        {/* Streaming or saved content */}
        {displayContent && (
          <div style={{ fontSize: '12.5px', lineHeight: 1.7, color: 'var(--text-primary)' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(displayContent) }} />
        )}

        {/* Empty state */}
        {!loading && !displayContent && !error && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>☀️</div>
            Cliquez sur Actualiser pour générer le briefing du jour
          </div>
        )}
      </div>
    </div>
  );
}
