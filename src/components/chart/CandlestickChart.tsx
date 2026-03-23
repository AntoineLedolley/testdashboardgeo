'use client';
import { useEffect, useRef } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  SeriesType,
  CandlestickSeries,
  BaselineSeries,
  LineSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  Time,
} from 'lightweight-charts';
import { CandleData, ChartType } from '@/types/chart';
import { calcMA, calcRSI, calcMACD, calcBollinger } from '@/lib/indicators';

interface Props {
  candles: CandleData[];
  chartType: ChartType;
  showMA20: boolean;
  showMA50: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showBollinger: boolean;
}

const BG          = '#0d0d0d';
const GRID        = 'rgba(255,255,255,0.03)';
const AXIS_TEXT   = '#6b7280';
const CROSSHAIR   = 'rgba(255,255,255,0.15)';
const LABEL_BG    = '#1f1f1f';
const GREEN       = '#4ade80';
const RED         = '#f472b6';

export default function CandlestickChart({ candles, chartType, showMA20, showMA50, showRSI, showMACD, showBollinger }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef     = useRef<IChartApi | null>(null);
  // Main pane series
  const sr = useRef<Record<string, ISeriesApi<SeriesType> | null>>({
    candle: null, baseline: null,
    ma20: null, ma50: null,
    bbUpper: null, bbMiddle: null, bbLower: null,
  });
  // Sub-pane series — created lazily on first toggle
  const rsiSr  = useRef<{ rsi: ISeriesApi<SeriesType> | null; ob: ISeriesApi<SeriesType> | null; os: ISeriesApi<SeriesType> | null }>({ rsi: null, ob: null, os: null });
  const macdSr = useRef<{ hist: ISeriesApi<SeriesType> | null; line: ISeriesApi<SeriesType> | null; signal: ISeriesApi<SeriesType> | null }>({ hist: null, line: null, signal: null });
  const hasRSI  = useRef(false);
  const hasMACD = useRef(false);

  // Keep latest candle data accessible in effects
  const candlesRef = useRef<CandleData[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: BG }, textColor: AXIS_TEXT, fontSize: 11 },
      grid: { vertLines: { color: GRID }, horzLines: { color: GRID } },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: CROSSHAIR, width: 1, labelBackgroundColor: LABEL_BG },
        horzLine: { color: CROSSHAIR, width: 1, labelBackgroundColor: LABEL_BG },
      },
      rightPriceScale: { borderVisible: false, textColor: AXIS_TEXT },
      timeScale: { borderVisible: false, timeVisible: true, secondsVisible: false },
      width:  containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    // Main pane (no sub-panes until user enables RSI/MACD)
    sr.current.candle = chart.addSeries(CandlestickSeries, {
      upColor: GREEN, downColor: RED, borderUpColor: GREEN, borderDownColor: RED, wickUpColor: GREEN, wickDownColor: RED,
    });

    sr.current.baseline = chart.addSeries(BaselineSeries, {
      baseValue: { type: 'price', price: 0 },
      topLineColor: GREEN, topFillColor1: 'rgba(74,222,128,0.25)', topFillColor2: 'rgba(74,222,128,0)',
      bottomLineColor: RED, bottomFillColor1: 'rgba(244,114,182,0)', bottomFillColor2: 'rgba(244,63,94,0.35)',
      lineWidth: 2, visible: false, priceLineVisible: true, priceLineColor: '#444', priceLineStyle: LineStyle.Dashed,
    });

    sr.current.ma20 = chart.addSeries(LineSeries, { color: '#fbbf24', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    sr.current.ma50 = chart.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
    sr.current.bbUpper  = chart.addSeries(LineSeries, { color: 'rgba(96,165,250,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, visible: false });
    sr.current.bbMiddle = chart.addSeries(LineSeries, { color: 'rgba(96,165,250,0.2)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, visible: false });
    sr.current.bbLower  = chart.addSeries(LineSeries, { color: 'rgba(96,165,250,0.4)', lineWidth: 1, lineStyle: LineStyle.Dashed, priceLineVisible: false, lastValueVisible: false, visible: false });

    chartRef.current = chart;

    const observer = new ResizeObserver((entries) => {
      for (const e of entries) chart.applyOptions({ width: e.contentRect.width, height: e.contentRect.height });
    });
    observer.observe(containerRef.current);
    return () => { observer.disconnect(); chart.remove(); chartRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Feed candle data
  useEffect(() => {
    if (!chartRef.current || !candles.length) return;
    candlesRef.current = candles;
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const t = (p: { time: number }) => p.time as Time;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const set = (s: ISeriesApi<SeriesType> | null, data: unknown[]) => (s as any)?.setData(data);

    const prevClose = sorted.length > 1 ? sorted[sorted.length - 2].close : sorted[0].open;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sr.current.baseline as any)?.applyOptions({ baseValue: { type: 'price', price: prevClose } });

    set(sr.current.candle,   sorted.map((c) => ({ time: t(c), open: c.open, high: c.high, low: c.low, close: c.close })));
    set(sr.current.baseline, sorted.map((c) => ({ time: t(c), value: c.close })));
    set(sr.current.ma20, calcMA(sorted, 20).map((p) => ({ time: t(p), value: p.value })));
    set(sr.current.ma50, calcMA(sorted, 50).map((p) => ({ time: t(p), value: p.value })));

    const bb = calcBollinger(sorted, 20, 2);
    set(sr.current.bbUpper,  bb.map((p) => ({ time: t(p), value: p.upper })));
    set(sr.current.bbMiddle, bb.map((p) => ({ time: t(p), value: p.middle })));
    set(sr.current.bbLower,  bb.map((p) => ({ time: t(p), value: p.lower })));

    // Refresh sub-panes if already created
    if (hasRSI.current) feedRSI(sorted);
    if (hasMACD.current) feedMACD(sorted);

    chartRef.current.timeScale().fitContent();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles]);

  function feedRSI(sorted: CandleData[]) {
    if (!rsiSr.current.rsi) return;
    const t = (p: { time: number }) => p.time as Time;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const set = (s: ISeriesApi<SeriesType> | null, data: unknown[]) => (s as any)?.setData(data);
    const rsiData = calcRSI(sorted, 14);
    set(rsiSr.current.rsi, rsiData.map((p) => ({ time: t(p), value: p.value })));
    set(rsiSr.current.ob,  rsiData.map((p) => ({ time: t(p), value: 70 })));
    set(rsiSr.current.os,  rsiData.map((p) => ({ time: t(p), value: 30 })));
  }

  function feedMACD(sorted: CandleData[]) {
    if (!macdSr.current.hist) return;
    const macdData = calcMACD(sorted);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const set = (s: ISeriesApi<SeriesType> | null, data: unknown[]) => (s as any)?.setData(data);
    set(macdSr.current.line,   macdData.map((p) => ({ time: p.time as Time, value: p.macd })));
    set(macdSr.current.signal, macdData.map((p) => ({ time: p.time as Time, value: p.signal })));
    set(macdSr.current.hist,   macdData.map((p) => ({ time: p.time as Time, value: p.histogram, color: p.histogram >= 0 ? `${GREEN}bb` : `${RED}bb` })));
  }

  // Toggle helpers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vis = (s: ISeriesApi<SeriesType> | null, v: boolean) => (s as any)?.applyOptions({ visible: v });

  useEffect(() => { vis(sr.current.candle, chartType === 'candlestick'); vis(sr.current.baseline, chartType === 'line'); }, [chartType]);
  useEffect(() => { vis(sr.current.ma20, showMA20); }, [showMA20]);
  useEffect(() => { vis(sr.current.ma50, showMA50); }, [showMA50]);
  useEffect(() => { [sr.current.bbUpper, sr.current.bbMiddle, sr.current.bbLower].forEach((s) => vis(s, showBollinger)); }, [showBollinger]);

  // RSI — lazy pane creation
  useEffect(() => {
    if (!chartRef.current) return;
    if (showRSI && !hasRSI.current) {
      // Create RSI pane for the first time
      hasRSI.current = true;
      rsiSr.current.rsi = chartRef.current.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 1, priceLineVisible: false, lastValueVisible: true }, 1);
      rsiSr.current.ob  = chartRef.current.addSeries(LineSeries, { color: `${RED}55`, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false }, 1);
      rsiSr.current.os  = chartRef.current.addSeries(LineSeries, { color: `${GREEN}55`, lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false }, 1);
      const sorted = [...candlesRef.current].sort((a, b) => a.time - b.time);
      if (sorted.length) feedRSI(sorted);
    }
    if (hasRSI.current) {
      vis(rsiSr.current.rsi, showRSI);
      vis(rsiSr.current.ob, showRSI);
      vis(rsiSr.current.os, showRSI);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRSI]);

  // MACD — lazy pane creation
  useEffect(() => {
    if (!chartRef.current) return;
    if (showMACD && !hasMACD.current) {
      hasMACD.current = true;
      const pane = hasRSI.current ? 2 : 1;
      macdSr.current.hist   = chartRef.current.addSeries(HistogramSeries, { priceLineVisible: false, lastValueVisible: false }, pane);
      macdSr.current.line   = chartRef.current.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, pane);
      macdSr.current.signal = chartRef.current.addSeries(LineSeries, { color: RED, lineWidth: 1, priceLineVisible: false, lastValueVisible: false }, pane);
      const sorted = [...candlesRef.current].sort((a, b) => a.time - b.time);
      if (sorted.length) feedMACD(sorted);
    }
    if (hasMACD.current) {
      vis(macdSr.current.hist, showMACD);
      vis(macdSr.current.line, showMACD);
      vis(macdSr.current.signal, showMACD);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMACD]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
