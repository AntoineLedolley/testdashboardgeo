'use client';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useTradeStore } from '@/lib/store';

interface HeatmapStock {
  symbol: string;
  name: string;
  mcap: number;
  price: number;
  changePercent: number;
}

interface HeatmapSector {
  name: string;
  totalMcap: number;
  changePercent: number;
  stocks: HeatmapStock[];
}

// ── Colors (Perplexity style) ────────────────────────────────────────────────
function getColor(pct: number): string {
  const clamped = Math.max(-5, Math.min(5, pct));
  if (pct > 0) {
    const t = clamped / 5;
    return `rgb(${Math.round(30 + (21 - 30) * t)},${Math.round(30 + (82 - 30) * t)},${Math.round(30 + (50 - 30) * t)})`;
  } else if (pct < 0) {
    const t = Math.abs(clamped) / 5;
    return `rgb(${Math.round(30 + (139 - 30) * t)},${Math.round(30 + (26 - 30) * t)},${Math.round(30 + (42 - 30) * t)})`;
  }
  return 'rgb(30,30,30)';
}

function getTextColor(pct: number): string {
  if (pct > 0.3) return '#4ade80';
  if (pct < -0.3) return '#f472b6';
  return '#6b7280';
}

// ── Squarify (Bruls et al.) ───────────────────────────────────────────────────
interface Item { id: string; value: number; sectorName?: string }
interface TileRect { id: string; x: number; y: number; w: number; h: number; sectorName?: string }

function worst(row: Item[], side: number, total: number, area: number): number {
  if (row.length === 0 || side <= 0) return Infinity;
  const s = row.reduce((a, i) => a + i.value, 0);
  const stripLen = (s / total) * (area / side); // long-axis dimension of strip
  let max = 0;
  for (const item of row) {
    const tileShort = (item.value / s) * side;
    if (tileShort <= 0) continue;
    const ar = Math.max(stripLen / tileShort, tileShort / stripLen);
    if (ar > max) max = ar;
  }
  return max;
}

function squarify(items: Item[], x: number, y: number, w: number, h: number): TileRect[] {
  const results: TileRect[] = [];

  function layoutStrip(row: Item[], rx: number, ry: number, rw: number, rh: number, useShortH: boolean) {
    const rowTotal = row.reduce((a, i) => a + i.value, 0);
    let offset = 0;
    for (const item of row) {
      const frac = rowTotal > 0 ? item.value / rowTotal : 0;
      if (useShortH) {
        // strip runs vertically (short side = w)
        const tileH = rh * frac;
        results.push({ id: item.id, sectorName: item.sectorName, x: rx, y: ry + offset, w: rw, h: tileH });
        offset += tileH;
      } else {
        // strip runs horizontally (short side = h)
        const tileW = rw * frac;
        results.push({ id: item.id, sectorName: item.sectorName, x: rx + offset, y: ry, w: tileW, h: rh });
        offset += tileW;
      }
    }
  }

  function place(sorted: Item[], rx: number, ry: number, rw: number, rh: number) {
    if (sorted.length === 0) return;
    if (sorted.length === 1) {
      results.push({ id: sorted[0].id, sectorName: sorted[0].sectorName, x: rx, y: ry, w: rw, h: rh });
      return;
    }

    const total = sorted.reduce((a, i) => a + i.value, 0);
    const area = rw * rh;
    const shortH = rh < rw; // true = H is the short side → strips run left-to-right stacking vertically
    const side = shortH ? rh : rw;

    let row: Item[] = [sorted[0]];
    let cutIdx = 1;

    for (let i = 1; i < sorted.length; i++) {
      const candidate = [...row, sorted[i]];
      const wCurrent = worst(row, side, total, area);
      const wCandidate = worst(candidate, side, total, area);
      if (wCandidate <= wCurrent) {
        row = candidate;
        cutIdx = i + 1;
      } else {
        break;
      }
    }

    const stripFrac = row.reduce((a, i) => a + i.value, 0) / total;
    if (shortH) {
      // H is short → strips stack left-to-right, each strip has width = rw*stripFrac
      const stripW = rw * stripFrac;
      layoutStrip(row, rx, ry, stripW, rh, true);
      place(sorted.slice(cutIdx), rx + stripW, ry, rw - stripW, rh);
    } else {
      // W is short → strips stack top-to-bottom, each strip has height = rh*stripFrac
      const stripH = rh * stripFrac;
      layoutStrip(row, rx, ry, rw, stripH, false);
      place(sorted.slice(cutIdx), rx, ry + stripH, rw, rh - stripH);
    }
  }

  place([...items].sort((a, b) => b.value - a.value), x, y, w, h);

  const map = new Map<string, TileRect>();
  for (const r of results) map.set(r.id, r);
  return items.map((it) => map.get(it.id)!).filter(Boolean);
}

// ── Component ─────────────────────────────────────────────────────────────────
interface TooltipData { stock: HeatmapStock; sector: string; x: number; y: number }

export default function HeatmapView() {
  const [sectors, setSectors] = useState<HeatmapSector[]>([]);
  const [loading, setLoading] = useState(true);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [size, setSize] = useState({ w: 900, h: 500 });
  const containerRef = useRef<HTMLDivElement>(null);
  const { setActiveView, setActiveSymbol } = useTradeStore();

  const refresh = useCallback(() => {
    setLoading(true);
    fetch('/api/heatmap')
      .then((r) => r.json())
      .then((d) => { setSectors(d.sectors ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Flatten all stocks, ordered by sector (so same-sector tiles cluster together)
  const allStocks: (Item & { sectorName: string; stock: HeatmapStock })[] = sectors.flatMap((sec) =>
    sec.stocks.map((st) => ({ id: st.symbol, value: st.mcap, sectorName: sec.name, stock: st }))
  );

  const stockMap = new Map(allStocks.map((s) => [s.id, s]));
  const tiles = allStocks.length > 0 ? squarify(allStocks, 0, 0, size.w, size.h) : [];

  const GAP = 2;
  const totalMcap = sectors.reduce((s, sec) => s + sec.totalMcap, 0);

  // Detect sector region boundaries for labels
  type SectorBbox = { name: string; minX: number; minY: number; maxX: number; maxY: number };
  const sectorBboxes = new Map<string, SectorBbox>();
  for (const tile of tiles) {
    const entry = stockMap.get(tile.id);
    if (!entry) continue;
    const sn = entry.sectorName;
    const existing = sectorBboxes.get(sn);
    if (!existing) {
      sectorBboxes.set(sn, { name: sn, minX: tile.x, minY: tile.y, maxX: tile.x + tile.w, maxY: tile.y + tile.h });
    } else {
      existing.minX = Math.min(existing.minX, tile.x);
      existing.minY = Math.min(existing.minY, tile.y);
      existing.maxX = Math.max(existing.maxX, tile.x + tile.w);
      existing.maxY = Math.max(existing.maxY, tile.y + tile.h);
    }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-base)' }}>
      {/* Header */}
      <div style={{ height: '60px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid var(--border)' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Heatmap S&P 500</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {loading ? 'Chargement...' : `${allStocks.length} titres · taille = capitalisation · cliquer pour ouvrir le graphique`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {!loading && sectors.length > 0 && (() => {
            const best = sectors.reduce((a, b) => b.changePercent > a.changePercent ? b : a);
            const worst2 = sectors.reduce((a, b) => b.changePercent < a.changePercent ? b : a);
            return (
              <>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Meilleur : <span style={{ color: '#4ade80', fontWeight: 600 }}>{best.name} +{best.changePercent.toFixed(2)}%</span>
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Pire : <span style={{ color: '#f472b6', fontWeight: 600 }}>{worst2.name} {worst2.changePercent.toFixed(2)}%</span>
                </span>
              </>
            );
          })()}
          <button
            onClick={refresh}
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px 10px', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}
          >
            Actualiser
          </button>
        </div>
      </div>

      {/* Treemap */}
      <div ref={containerRef} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '12px', gap: '8px' }}>
            <div className="spinner" />
            Chargement des données...
          </div>
        ) : (
          <svg width={size.w} height={size.h} style={{ display: 'block' }}>
            {/* Stock tiles */}
            {tiles.map((tile) => {
              const entry = stockMap.get(tile.id);
              if (!entry) return null;
              const { stock } = entry;
              const tw = tile.w - GAP;
              const th = tile.h - GAP;
              if (tw < 3 || th < 3) return null;

              const showSymbol = tw > 28 && th > 14;
              const showPct    = tw > 36 && th > 28;
              const showName   = tw > 60 && th > 42;
              const fontSize   = Math.min(13, Math.max(8, tw / 5));
              const pctSize    = Math.min(11, Math.max(7, tw / 6));

              return (
                <g
                  key={stock.symbol}
                  style={{ cursor: 'pointer' }}
                  onClick={() => { setActiveSymbol(stock.symbol); setActiveView('chart'); }}
                  onMouseMove={(e) => {
                    const rect = containerRef.current?.getBoundingClientRect();
                    if (!rect) return;
                    setTooltip({ stock, sector: entry.sectorName, x: e.clientX - rect.left, y: e.clientY - rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                >
                  <rect
                    x={tile.x + GAP / 2}
                    y={tile.y + GAP / 2}
                    width={tw}
                    height={th}
                    rx={3}
                    fill={getColor(stock.changePercent)}
                    stroke="rgba(0,0,0,0.25)"
                    strokeWidth={0.5}
                  />
                  {showName && (
                    <text x={tile.x + GAP / 2 + tw / 2} y={tile.y + GAP / 2 + th / 2 - (showPct ? 10 : 0) - (showPct ? 4 : 0)}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={fontSize} fontWeight={700} fill="#ffffff" style={{ userSelect: 'none' }}>
                      {stock.symbol}
                    </text>
                  )}
                  {!showName && showSymbol && (
                    <text x={tile.x + GAP / 2 + tw / 2} y={tile.y + GAP / 2 + th / 2 - (showPct ? 7 : 0)}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={fontSize} fontWeight={700} fill="#ffffff" style={{ userSelect: 'none' }}>
                      {stock.symbol}
                    </text>
                  )}
                  {showName && (
                    <text x={tile.x + GAP / 2 + tw / 2} y={tile.y + GAP / 2 + th / 2 + 2}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={Math.min(10, fontSize - 1)} fill="rgba(255,255,255,0.6)" style={{ userSelect: 'none' }}>
                      {stock.name}
                    </text>
                  )}
                  {showPct && (
                    <text x={tile.x + GAP / 2 + tw / 2}
                      y={tile.y + GAP / 2 + th / 2 + (showName ? 16 : 10)}
                      textAnchor="middle" dominantBaseline="middle"
                      fontSize={pctSize} fill={getTextColor(stock.changePercent)} style={{ userSelect: 'none' }}>
                      {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* Sector boundary labels */}
            {Array.from(sectorBboxes.values()).map((bbox) => {
              const bw = bbox.maxX - bbox.minX;
              if (bw < 40) return null;
              return (
                <g key={bbox.name} style={{ pointerEvents: 'none' }}>
                  <rect
                    x={bbox.minX + GAP / 2 + 4}
                    y={bbox.minY + GAP / 2 + 4}
                    width={Math.min(bw - 12, bbox.name.length * 6.5 + 10)}
                    height={16}
                    rx={3}
                    fill="rgba(0,0,0,0.55)"
                  />
                  <text
                    x={bbox.minX + GAP / 2 + 9}
                    y={bbox.minY + GAP / 2 + 13}
                    fontSize={9}
                    fontWeight={600}
                    fill="rgba(255,255,255,0.7)"
                    style={{ userSelect: 'none', textTransform: 'uppercase', letterSpacing: '0.4px' }}
                  >
                    {bbox.name.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: Math.min(tooltip.x + 12, size.w - 160),
            top: Math.max(tooltip.y - 80, 4),
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-bright)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '11px',
            pointerEvents: 'none',
            zIndex: 100,
            minWidth: '150px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
          }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {tooltip.stock.symbol} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {tooltip.stock.name}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Price: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>${tooltip.stock.price.toFixed(2)}</span>
            </div>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>
              Change: <span style={{ color: getTextColor(tooltip.stock.changePercent), fontWeight: 600 }}>
                {tooltip.stock.changePercent >= 0 ? '+' : ''}{tooltip.stock.changePercent.toFixed(2)}%
              </span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '2px' }}>
              Mkt Cap: ${tooltip.stock.mcap >= 1000 ? `${(tooltip.stock.mcap / 1000).toFixed(1)}T` : `${tooltip.stock.mcap}B`}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>{tooltip.sector}</div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div style={{ height: '36px', flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '0 20px', borderTop: '1px solid var(--border)' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>-5%</span>
        <div style={{ width: '160px', height: '10px', borderRadius: '3px', background: 'linear-gradient(to right, rgb(139,26,42), rgb(30,30,30), rgb(21,82,50))', flexShrink: 0 }} />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>+5%</span>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '16px' }}>Taille = capitalisation boursière</span>
        {totalMcap > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--accent)', marginLeft: 'auto' }}>
            Cap. totale : ${(totalMcap / 1000).toFixed(1)}T
          </span>
        )}
      </div>
    </div>
  );
}
