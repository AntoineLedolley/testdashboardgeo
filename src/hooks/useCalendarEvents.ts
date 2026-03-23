'use client';
import { useState, useEffect } from 'react';
import { AiCalendarEvent } from '@/types/ai';

let cache: AiCalendarEvent[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 1000 * 60 * 30; // 30 min

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00'); target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<AiCalendarEvent[]>(cache ?? []);

  useEffect(() => {
    if (cache && Date.now() - cacheTime < CACHE_TTL) { setEvents(cache); return; }
    fetch('/api/calendar')
      .then((r) => r.json())
      .then((d) => {
        const mapped: AiCalendarEvent[] = (d.events ?? []).map((e: {
          title: string; date: string; type: string; importance: string; forecast?: string; actual?: string;
        }) => ({
          title: e.title, date: e.date, type: e.type, importance: e.importance,
          forecast: e.forecast, actual: e.actual,
          daysUntil: daysUntil(e.date),
        }));
        cache = mapped;
        cacheTime = Date.now();
        setEvents(mapped);
      })
      .catch(() => {});
  }, []);

  // upcoming events in next 30 days
  const upcoming = events.filter((e) => e.daysUntil >= 0 && e.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 8);

  return { events, upcoming };
}
