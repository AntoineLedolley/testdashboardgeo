'use client';
import { useState, useEffect, useRef } from 'react';
import { StockQuote } from '@/types/stock';

export function useStockQuote(symbol: string, pollInterval = 5000) {
  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const prevPriceRef = useRef<number | null>(null);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (!symbol) return;

    const fetchQuote = async () => {
      try {
        const r = await fetch(`/api/stock/quote?symbols=${symbol}`);
        const data = await r.json();
        const q = data[symbol];
        if (q) {
          if (prevPriceRef.current !== null && q.price !== prevPriceRef.current) {
            setFlashClass(q.price > prevPriceRef.current ? 'flash-green' : 'flash-red');
            setTimeout(() => setFlashClass(''), 1000);
          }
          prevPriceRef.current = q.price;
          setQuote(q);
          setLoading(false);
        }
      } catch {
        // ignore
      }
    };

    fetchQuote();
    const id = setInterval(fetchQuote, pollInterval);
    return () => clearInterval(id);
  }, [symbol, pollInterval]);

  return { quote, loading, flashClass };
}

export function useMultiQuote(symbols: string[], pollInterval = 5000) {
  const [quotes, setQuotes] = useState<Record<string, StockQuote>>({});

  useEffect(() => {
    if (!symbols.length) return;

    const fetchAll = async () => {
      try {
        const r = await fetch(`/api/stock/quote?symbols=${symbols.join(',')}`);
        const data = await r.json();
        setQuotes(data);
      } catch {
        // ignore
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, pollInterval);
    return () => clearInterval(id);
  }, [symbols.join(','), pollInterval]);

  return { quotes };
}
