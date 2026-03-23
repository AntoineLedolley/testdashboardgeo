'use client';
import { useEffect, useState } from 'react';
import { EconomicEvent, EventType } from '@/types/calendar';

const TYPE_CONFIG: Record<EventType, { color: string; label: string; abbr: string }> = {
  fed:       { color: '#60a5fa', label: 'Fed / FOMC',  abbr: 'FED' },
  inflation: { color: '#f472b6', label: 'Inflation',   abbr: 'CPI' },
  jobs:      { color: '#4ade80', label: 'Emplois / NFP', abbr: 'NFP' },
  earnings:  { color: '#fbbf24', label: 'Résultats',   abbr: 'EPS' },
  gdp:       { color: '#a78bfa', label: 'PIB',         abbr: 'PIB' },
  other:     { color: '#6b7280', label: 'Autre',       abbr: 'ECO' },
};

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Parse as local date, not UTC
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { weekday: 'short', month: 'short', day: 'numeric' });
}

function ImportanceDot({ level }: { level: string }) {
  const color = level === 'high' ? '#f472b6' : level === 'medium' ? '#fbbf24' : '#4ade80';
  return <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: color, marginRight: '4px', flexShrink: 0 }} />;
}

function CountdownBadge({ days }: { days: number }) {
  if (days === 0) return (
    <span style={{ fontSize: '10px', fontWeight: 700, color: '#fbbf24', background: 'rgba(251,191,36,0.12)', padding: '2px 7px', borderRadius: '4px', border: '1px solid rgba(251,191,36,0.25)' }}>AUJOURD&apos;HUI</span>
  );
  if (days === 1) return (
    <span style={{ fontSize: '10px', fontWeight: 600, color: '#f472b6', background: 'rgba(244,114,182,0.1)', padding: '2px 7px', borderRadius: '4px' }}>Demain</span>
  );
  if (days < 0) return <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>il y a {Math.abs(days)}j</span>;
  return <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>dans {days}j</span>;
}

export default function CalendarView() {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  useEffect(() => {
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((d) => { setEvents(d.events ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const withDays = events.map((e) => ({ ...e, _days: daysUntil(e.date) }));
  const filtered = filter === 'all' ? withDays : withDays.filter((e) => e.type === filter);
  const upcoming = filtered.filter((e) => e._days >= -1).sort((a, b) => a._days - b._days);
  const past = filtered.filter((e) => e._days < -1).slice(-5).reverse();

  // Next event banner
  const nextEvent = upcoming[0];

  const filterTypes: (EventType | 'all')[] = ['all', 'fed', 'inflation', 'jobs', 'earnings', 'gdp'];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '10px', letterSpacing: '-0.3px' }}>
          Calendrier Économique
        </div>

        {/* Next event callout */}
        {nextEvent && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
            background: `${TYPE_CONFIG[nextEvent.type].color}10`,
            border: `1px solid ${TYPE_CONFIG[nextEvent.type].color}30`,
            borderRadius: '8px', marginBottom: '10px',
          }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: TYPE_CONFIG[nextEvent.type].color, background: `${TYPE_CONFIG[nextEvent.type].color}20`, padding: '2px 6px', borderRadius: '3px', flexShrink: 0 }}>
              {TYPE_CONFIG[nextEvent.type].abbr}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{nextEvent.title}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{formatDate(nextEvent.date)}{nextEvent.time ? ` · ${nextEvent.time} ET` : ''}</div>
            </div>
            <CountdownBadge days={nextEvent._days} />
          </div>
        )}

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {filterTypes.map((f) => {
            const isActive = filter === f;
            const cfg = f !== 'all' ? TYPE_CONFIG[f] : null;
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: '3px 9px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer',
                border: `1px solid ${isActive ? (cfg?.color ?? 'var(--accent)') : 'var(--border)'}`,
                background: isActive ? `${cfg?.color ?? 'var(--accent)'}18` : 'transparent',
                color: isActive ? (cfg?.color ?? 'var(--accent)') : 'var(--text-muted)',
                fontWeight: isActive ? 600 : 400, transition: 'all 0.12s',
              }}>
                {f === 'all' ? 'Tous' : cfg!.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Events list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ height: '58px', borderRadius: '8px' }} className="skeleton" />
            ))}
          </div>
        ) : (
          <>
            {upcoming.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>
                Aucun événement à venir pour ce filtre
              </div>
            )}

            {upcoming.map((event) => {
              const cfg = TYPE_CONFIG[event.type];
              const isToday = event._days === 0;
              const isSoon = event._days <= 3 && event._days >= 0;
              return (
                <div key={event.id} style={{
                  display: 'flex', gap: '10px', padding: '10px 12px', marginBottom: '5px',
                  background: isToday ? `${cfg.color}08` : 'var(--bg-surface)',
                  borderRadius: '8px',
                  border: `1px solid ${isToday ? cfg.color + '30' : 'var(--border)'}`,
                  borderLeft: `3px solid ${isSoon ? cfg.color : 'transparent'}`,
                  transition: 'border-color 0.15s',
                }}>
                  {/* Type badge */}
                  <div style={{ flexShrink: 0, paddingTop: '1px' }}>
                    <div style={{
                      fontSize: '9px', fontWeight: 700, color: cfg.color,
                      background: `${cfg.color}18`, padding: '2px 5px', borderRadius: '3px',
                      letterSpacing: '0.3px', minWidth: '28px', textAlign: 'center',
                    }}>{cfg.abbr}</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <ImportanceDot level={event.importance} />
                        <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{event.title}</span>
                      </div>
                      <CountdownBadge days={event._days} />
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px' }}>
                      {formatDate(event.date)}{event.time ? ` · ${event.time} ET` : ''}
                    </div>
                    {(event.forecast || event.previous || event.actual) && (
                      <div style={{ display: 'flex', gap: '14px', marginTop: '5px' }}>
                        {event.forecast && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Prévu : <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>{event.forecast}</span>
                          </span>
                        )}
                        {event.previous && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Préc. : <span style={{ color: 'var(--text-secondary)' }}>{event.previous}</span>
                          </span>
                        )}
                        {event.actual && (
                          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            Réel : <span style={{ color: 'var(--green)', fontWeight: 600 }}>{event.actual}</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {past.length > 0 && (
              <>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '20px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 600 }}>
                  Passé récent
                </div>
                {past.map((event) => {
                  const cfg = TYPE_CONFIG[event.type];
                  return (
                    <div key={event.id + '-past'} style={{
                      display: 'flex', gap: '10px', padding: '7px 10px', marginBottom: '4px',
                      background: 'var(--bg-surface)', borderRadius: '6px', opacity: 0.45,
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{ fontSize: '9px', fontWeight: 700, color: cfg.color, background: `${cfg.color}18`, padding: '2px 5px', borderRadius: '3px', flexShrink: 0, height: 'fit-content' }}>{cfg.abbr}</div>
                      <div>
                        <div style={{ fontSize: '11px', color: 'var(--text-primary)' }}>{event.title}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{formatDate(event.date)}</div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
