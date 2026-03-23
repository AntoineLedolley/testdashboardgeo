import { NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const yf2 = require('yahoo-finance2');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const YFClass = yf2.default as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yahooFinance: any = new YFClass();

import { EconomicEvent } from '@/types/calendar';

// Full macro calendar 2025-2026
const MACRO_EVENTS: EconomicEvent[] = [
  // ── FOMC ────────────────────────────────────────────────────────────────────
  { id: 'fomc-2026-03', title: 'FOMC Meeting Decision', date: '2026-03-18', time: '14:00', type: 'fed', importance: 'high', previous: '4.25-4.50%' },
  { id: 'fomc-2026-04', title: 'FOMC Meeting Decision', date: '2026-04-29', time: '14:00', type: 'fed', importance: 'high' },
  { id: 'fomc-2026-06', title: 'FOMC Meeting Decision', date: '2026-06-10', time: '14:00', type: 'fed', importance: 'high' },
  { id: 'fomc-2026-07', title: 'FOMC Meeting Decision', date: '2026-07-29', time: '14:00', type: 'fed', importance: 'high' },
  { id: 'fomc-2026-09', title: 'FOMC Meeting Decision', date: '2026-09-16', time: '14:00', type: 'fed', importance: 'high' },
  { id: 'fomc-2026-11', title: 'FOMC Meeting Decision', date: '2026-11-04', time: '14:00', type: 'fed', importance: 'high' },
  { id: 'fomc-2026-12', title: 'FOMC Meeting Decision', date: '2026-12-16', time: '14:00', type: 'fed', importance: 'high' },
  // ── CPI ─────────────────────────────────────────────────────────────────────
  { id: 'cpi-2026-03', title: 'CPI (Feb 2026)', date: '2026-03-11', time: '08:30', type: 'inflation', importance: 'high', forecast: '2.8%', previous: '3.0%' },
  { id: 'cpi-2026-04', title: 'CPI (Mar 2026)', date: '2026-04-10', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-05', title: 'CPI (Apr 2026)', date: '2026-05-13', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-06', title: 'CPI (May 2026)', date: '2026-06-10', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-07', title: 'CPI (Jun 2026)', date: '2026-07-14', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-08', title: 'CPI (Jul 2026)', date: '2026-08-12', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-09', title: 'CPI (Aug 2026)', date: '2026-09-10', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-10', title: 'CPI (Sep 2026)', date: '2026-10-14', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-11', title: 'CPI (Oct 2026)', date: '2026-11-12', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'cpi-2026-12', title: 'CPI (Nov 2026)', date: '2026-12-10', time: '08:30', type: 'inflation', importance: 'high' },
  // ── NFP ─────────────────────────────────────────────────────────────────────
  { id: 'nfp-2026-03', title: 'Non-Farm Payrolls (Feb 2026)', date: '2026-03-06', time: '08:30', type: 'jobs', importance: 'high', forecast: '+185K', previous: '+143K' },
  { id: 'nfp-2026-04', title: 'Non-Farm Payrolls (Mar 2026)', date: '2026-04-03', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-05', title: 'Non-Farm Payrolls (Apr 2026)', date: '2026-05-01', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-06', title: 'Non-Farm Payrolls (May 2026)', date: '2026-06-05', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-07', title: 'Non-Farm Payrolls (Jun 2026)', date: '2026-07-02', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-08', title: 'Non-Farm Payrolls (Jul 2026)', date: '2026-08-07', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-09', title: 'Non-Farm Payrolls (Aug 2026)', date: '2026-09-04', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-10', title: 'Non-Farm Payrolls (Sep 2026)', date: '2026-10-02', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-11', title: 'Non-Farm Payrolls (Oct 2026)', date: '2026-11-06', time: '08:30', type: 'jobs', importance: 'high' },
  { id: 'nfp-2026-12', title: 'Non-Farm Payrolls (Nov 2026)', date: '2026-12-04', time: '08:30', type: 'jobs', importance: 'high' },
  // ── GDP ─────────────────────────────────────────────────────────────────────
  { id: 'gdp-2026-q1-adv', title: 'GDP Q1 2026 (Advance)', date: '2026-04-29', time: '08:30', type: 'gdp', importance: 'high' },
  { id: 'gdp-2026-q1-2nd', title: 'GDP Q1 2026 (2nd Est.)', date: '2026-05-28', time: '08:30', type: 'gdp', importance: 'medium' },
  { id: 'gdp-2026-q2-adv', title: 'GDP Q2 2026 (Advance)', date: '2026-07-29', time: '08:30', type: 'gdp', importance: 'high' },
  { id: 'gdp-2026-q3-adv', title: 'GDP Q3 2026 (Advance)', date: '2026-10-28', time: '08:30', type: 'gdp', importance: 'high' },
  // ── PCE (Fed's preferred inflation gauge) ───────────────────────────────────
  { id: 'pce-2026-03', title: 'PCE Inflation (Feb 2026)', date: '2026-03-27', time: '08:30', type: 'inflation', importance: 'high', forecast: '2.5%' },
  { id: 'pce-2026-04', title: 'PCE Inflation (Mar 2026)', date: '2026-04-30', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'pce-2026-05', title: 'PCE Inflation (Apr 2026)', date: '2026-05-29', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'pce-2026-06', title: 'PCE Inflation (May 2026)', date: '2026-06-26', time: '08:30', type: 'inflation', importance: 'high' },
  { id: 'pce-2026-07', title: 'PCE Inflation (Jun 2026)', date: '2026-07-31', time: '08:30', type: 'inflation', importance: 'high' },
  // ── Retail Sales ────────────────────────────────────────────────────────────
  { id: 'retail-2026-03', title: 'Retail Sales (Feb 2026)', date: '2026-03-17', time: '08:30', type: 'other', importance: 'medium' },
  { id: 'retail-2026-04', title: 'Retail Sales (Mar 2026)', date: '2026-04-15', time: '08:30', type: 'other', importance: 'medium' },
  { id: 'retail-2026-05', title: 'Retail Sales (Apr 2026)', date: '2026-05-15', time: '08:30', type: 'other', importance: 'medium' },
];

const EARNINGS_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'AMD', 'JPM', 'GS', 'NFLX', 'BABA', 'TSM'];

export async function GET() {
  const events: EconomicEvent[] = [...MACRO_EVENTS];

  try {
    for (const symbol of EARNINGS_SYMBOLS) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const q: any = await yahooFinance.quoteSummary(symbol, { modules: ['calendarEvents'] });
        const earningsDate = q?.calendarEvents?.earnings?.earningsDate?.[0];
        if (earningsDate) {
          const d = new Date(earningsDate);
          const dateStr = d.toISOString().split('T')[0];
          // Only add if not already present
          if (!events.find((e) => e.id === `earnings-${symbol}`)) {
            events.push({
              id: `earnings-${symbol}`,
              title: `${symbol} Earnings`,
              date: dateStr,
              type: 'earnings',
              symbol,
              importance: 'high',
            });
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  events.sort((a, b) => a.date.localeCompare(b.date));

  return NextResponse.json({ events }, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900' },
  });
}
