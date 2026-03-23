'use client';
import { useState, useEffect } from 'react';
import { ChartResponse, ChartInterval, ChartRange } from '@/types/chart';

export function useStockData(symbol: string, interval: ChartInterval, range: ChartRange) {
  const [data, setData] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);

    const controller = new AbortController();

    fetch(`/api/stock/chart?symbol=${symbol}&interval=${interval}&range=${range}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError(e.message);
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [symbol, interval, range]);

  return { data, loading, error };
}
