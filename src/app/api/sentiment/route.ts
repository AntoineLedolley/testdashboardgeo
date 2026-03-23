import { NextRequest, NextResponse } from 'next/server';

export interface RedditPost {
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  url: string;
  created: number;
  selftext: string;
}

export interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: number;
}

export interface InsiderTrade {
  filingDate: string;
  reportingName: string;
  transactionType: string;
  shares: number;
  pricePerShare: number | null;
}

export interface SentimentData {
  reddit: RedditPost[];
  news: NewsItem[];
  insiderTrades: InsiderTrade[];
  redditMentions: number;
  sentimentScore: number; // -1 to 1
}

async function fetchReddit(symbol: string): Promise<RedditPost[]> {
  const subreddits = ['wallstreetbets', 'stocks', 'investing'];
  const posts: RedditPost[] = [];

  await Promise.all(
    subreddits.map(async (sub) => {
      try {
        const url = `https://www.reddit.com/r/${sub}/search.json?q=${encodeURIComponent(symbol)}&sort=hot&limit=3&t=week&restrict_sr=1`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'TradeAI/1.0 (financial analysis app)' },
          next: { revalidate: 300 },
        });
        if (!res.ok) return;
        const data = await res.json();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const children: any[] = data?.data?.children ?? [];
        children.forEach((child: any) => {
          const p = child.data;
          posts.push({
            title: p.title ?? '',
            subreddit: p.subreddit_name_prefixed ?? `r/${sub}`,
            score: p.score ?? 0,
            numComments: p.num_comments ?? 0,
            url: `https://reddit.com${p.permalink}`,
            created: p.created_utc ?? 0,
            selftext: (p.selftext ?? '').slice(0, 200),
          });
        });
      } catch {
        // ignore per-subreddit errors
      }
    })
  );

  return posts.sort((a, b) => b.score - a.score).slice(0, 8);
}

async function fetchNews(symbol: string): Promise<NewsItem[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const yf2 = require('yahoo-finance2');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const YFClass = yf2.default as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yahooFinance: any = new YFClass();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await yahooFinance.search(symbol, { newsCount: 6, quotesCount: 0 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (result.news ?? []).map((n: any) => ({
      title: n.title ?? '',
      publisher: n.publisher ?? '',
      link: n.link ?? '',
      publishedAt: n.providerPublishTime ?? 0,
    }));
  } catch {
    return [];
  }
}

async function fetchInsiderTrades(symbol: string): Promise<InsiderTrade[]> {
  try {
    // Search for CIK via EDGAR full-text search
    const searchRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${encodeURIComponent(symbol)}%22&forms=4&dateRange=custom&startdt=${new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)}`,
      { next: { revalidate: 3600 } }
    );
    if (!searchRes.ok) return [];
    const data = await searchRes.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hits: any[] = data?.hits?.hits ?? [];
    return hits.slice(0, 5).map((hit: any) => ({
      filingDate: hit._source?.file_date ?? '',
      reportingName: hit._source?.display_names?.[0] ?? 'Unknown',
      transactionType: hit._source?.period_of_report ?? '',
      shares: 0,
      pricePerShare: null,
    }));
  } catch {
    return [];
  }
}

function calcSentimentScore(posts: RedditPost[]): number {
  if (!posts.length) return 0;
  const bullishWords = ['bull', 'moon', 'buy', 'calls', 'long', 'up', 'bullish', 'breakout', 'strong', 'gains', 'rocket', '🚀', '📈'];
  const bearishWords = ['bear', 'down', 'puts', 'short', 'sell', 'crash', 'bearish', 'dump', 'weak', 'loss', '📉', '💀'];

  let totalScore = 0;
  posts.forEach((post) => {
    const text = (post.title + ' ' + post.selftext).toLowerCase();
    let score = 0;
    bullishWords.forEach((w) => { if (text.includes(w)) score += 1; });
    bearishWords.forEach((w) => { if (text.includes(w)) score -= 1; });
    totalScore += Math.sign(score) * Math.log(1 + post.score);
  });

  const maxPossible = posts.reduce((s, p) => s + Math.log(1 + p.score), 0);
  return maxPossible > 0 ? Math.max(-1, Math.min(1, totalScore / maxPossible)) : 0;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol')?.toUpperCase() ?? 'AAPL';

  const [reddit, news, insiderTrades] = await Promise.all([
    fetchReddit(symbol),
    fetchNews(symbol),
    fetchInsiderTrades(symbol),
  ]);

  const sentimentScore = calcSentimentScore(reddit);
  const redditMentions = reddit.reduce((s, p) => s + p.numComments + p.score, 0);

  const result: SentimentData = { reddit, news, insiderTrades, redditMentions, sentimentScore };

  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
