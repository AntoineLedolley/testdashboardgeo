import { CandleData, LinePoint } from '@/types/chart';

export function calcMA(candles: CandleData[], period: number): LinePoint[] {
  if (candles.length < period) return [];
  const result: LinePoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const avg = slice.reduce((sum, c) => sum + c.close, 0) / period;
    result.push({ time: candles[i].time, value: parseFloat(avg.toFixed(2)) });
  }
  return result;
}

export function calcEMA(candles: CandleData[], period: number): LinePoint[] {
  if (candles.length < period) return [];
  const k = 2 / (period + 1);
  const result: LinePoint[] = [];
  const sma = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  result.push({ time: candles[period - 1].time, value: parseFloat(sma.toFixed(4)) });
  let prev = sma;
  for (let i = period; i < candles.length; i++) {
    const ema = candles[i].close * k + prev * (1 - k);
    result.push({ time: candles[i].time, value: parseFloat(ema.toFixed(4)) });
    prev = ema;
  }
  return result;
}

export function calcRSI(candles: CandleData[], period = 14): LinePoint[] {
  if (candles.length < period + 1) return [];
  const result: LinePoint[] = [];
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < candles.length; i++) {
    if (i > period) {
      const diff = candles[i].close - candles[i - 1].close;
      avgGain = (avgGain * (period - 1) + Math.max(0, diff)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.max(0, -diff)) / period;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);
    result.push({ time: candles[i].time, value: parseFloat(rsi.toFixed(2)) });
  }
  return result;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export function calcMACD(candles: CandleData[], fast = 12, slow = 26, signalPeriod = 9): MACDPoint[] {
  if (candles.length < slow + signalPeriod) return [];

  const ema12 = calcEMA(candles, fast);
  const ema26 = calcEMA(candles, slow);

  const ema12Map = new Map(ema12.map((p) => [p.time, p.value]));
  const macdLine: LinePoint[] = [];
  for (const p of ema26) {
    const e12 = ema12Map.get(p.time);
    if (e12 !== undefined) {
      macdLine.push({ time: p.time, value: parseFloat((e12 - p.value).toFixed(4)) });
    }
  }
  macdLine.sort((a, b) => a.time - b.time);

  if (macdLine.length < signalPeriod) return [];

  const k = 2 / (signalPeriod + 1);
  const signalLine: number[] = [];
  const sma = macdLine.slice(0, signalPeriod).reduce((s, p) => s + p.value, 0) / signalPeriod;
  signalLine.push(sma);
  let prev = sma;
  for (let i = signalPeriod; i < macdLine.length; i++) {
    const s = macdLine[i].value * k + prev * (1 - k);
    signalLine.push(s);
    prev = s;
  }

  const result: MACDPoint[] = [];
  for (let i = 0; i < signalLine.length; i++) {
    const idx = i + signalPeriod - 1;
    if (idx >= macdLine.length) break;
    const macdVal = macdLine[idx].value;
    const signalVal = signalLine[i];
    result.push({
      time: macdLine[idx].time,
      macd: macdVal,
      signal: parseFloat(signalVal.toFixed(4)),
      histogram: parseFloat((macdVal - signalVal).toFixed(4)),
    });
  }
  return result;
}

export interface BollingerPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export function calcBollinger(candles: CandleData[], period = 20, multiplier = 2): BollingerPoint[] {
  if (candles.length < period) return [];
  const result: BollingerPoint[] = [];
  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, c) => s + c.close, 0) / period;
    const variance = slice.reduce((s, c) => s + Math.pow(c.close - mean, 2), 0) / period;
    const std = Math.sqrt(variance);
    result.push({
      time: candles[i].time,
      upper: parseFloat((mean + multiplier * std).toFixed(2)),
      middle: parseFloat(mean.toFixed(2)),
      lower: parseFloat((mean - multiplier * std).toFixed(2)),
    });
  }
  return result;
}

export function getLastMA(candles: CandleData[], period: number): number | null {
  const series = calcMA(candles, period);
  return series.length > 0 ? series[series.length - 1].value : null;
}

export function getLastRSI(candles: CandleData[]): number | null {
  const series = calcRSI(candles, 14);
  return series.length > 0 ? series[series.length - 1].value : null;
}
