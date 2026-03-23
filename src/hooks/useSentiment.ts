'use client';
import { useState, useEffect } from 'react';
import { SentimentData } from '@/app/api/sentiment/route';

export function useSentiment(symbol: string) {
  const [data, setData] = useState<SentimentData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setData(null);
    fetch(`/api/sentiment?symbol=${symbol}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [symbol]);

  return { data, loading };
}
