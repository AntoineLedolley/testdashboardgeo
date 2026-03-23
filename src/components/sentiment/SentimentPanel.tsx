'use client';
import { useState } from 'react';
import { useSentiment } from '@/hooks/useSentiment';
import { SentimentData } from '@/app/api/sentiment/route';

interface Props {
  symbol: string;
}

function SentimentBar({ score }: { score: number }) {
  const pct = ((score + 1) / 2) * 100;
  const color = score > 0.2 ? 'var(--green)' : score < -0.2 ? 'var(--red)' : 'var(--yellow)';
  const label = score > 0.3 ? '🐂 Bullish' : score < -0.3 ? '🐻 Bearish' : '😐 Neutre';
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sentiment Reddit</span>
        <span style={{ fontSize: '11px', fontWeight: '700', color }}>{label}</span>
      </div>
      <div style={{ height: '6px', background: 'var(--bg-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '3px', transition: 'width 0.5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
        <span style={{ fontSize: '9px', color: 'var(--red)' }}>Bearish</span>
        <span style={{ fontSize: '9px', color: 'var(--green)' }}>Bullish</span>
      </div>
    </div>
  );
}

type Tab = 'reddit' | 'news' | 'insider';

export default function SentimentPanel({ symbol }: Props) {
  const { data, loading } = useSentiment(symbol);
  const [tab, setTab] = useState<Tab>('reddit');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '2px' }}>
          🌐 Données Alternatives — {symbol}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
          Reddit · Actualités · Insider SEC EDGAR
        </div>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '10px' }}>
          <div className="spinner" style={{ width: '28px', height: '28px', borderWidth: '3px' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>Collecte des données...</span>
        </div>
      ) : data ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Sentiment bar */}
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <SentimentBar score={data.sentimentScore} />
            <div style={{ display: 'flex', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Posts Reddit</div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>{data.reddit.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Engagement</div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>{data.redditMentions.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Actualités</div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>{data.news.length}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Insiders</div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>{data.insiderTrades.length}</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            {(['reddit', 'news', 'insider'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '7px', background: 'transparent', border: 'none',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                fontSize: '10.5px', fontWeight: tab === t ? '600' : '400',
                color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)', cursor: 'pointer',
              }}>
                {t === 'reddit' ? '🟠 Reddit' : t === 'news' ? '📰 News' : '🏛️ Insiders'}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {tab === 'reddit' && <RedditTab posts={data.reddit} />}
            {tab === 'news' && <NewsTab news={data.news} />}
            {tab === 'insider' && <InsiderTab trades={data.insiderTrades} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RedditTab({ posts }: { posts: SentimentData['reddit'] }) {
  if (!posts.length) return <Empty text="Aucun post Reddit trouvé" />;
  return (
    <>
      {posts.map((post, i) => (
        <a key={i} href={post.url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', padding: '10px 14px', borderBottom: '1px solid var(--border)', textDecoration: 'none', transition: 'background 0.1s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.4', marginBottom: '4px' }}>{post.title}</div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--accent)' }}>{post.subreddit}</span>
            <span style={{ fontSize: '10px', color: 'var(--green)' }}>▲ {post.score.toLocaleString()}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>💬 {post.numComments}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>{new Date(post.created * 1000).toLocaleDateString('fr-FR')}</span>
          </div>
        </a>
      ))}
    </>
  );
}

function NewsTab({ news }: { news: SentimentData['news'] }) {
  if (!news.length) return <Empty text="Aucune actualité trouvée" />;
  return (
    <>
      {news.map((item, i) => (
        <a key={i} href={item.link} target="_blank" rel="noopener noreferrer"
          style={{ display: 'block', padding: '10px 14px', borderBottom: '1px solid var(--border)', textDecoration: 'none', transition: 'background 0.1s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          <div style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: '500', lineHeight: '1.4', marginBottom: '4px' }}>{item.title}</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--accent)' }}>{item.publisher}</span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {item.publishedAt ? new Date(item.publishedAt * 1000).toLocaleDateString('fr-FR') : ''}
            </span>
          </div>
        </a>
      ))}
    </>
  );
}

function InsiderTab({ trades }: { trades: SentimentData['insiderTrades'] }) {
  if (!trades.length) return (
    <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
      <div style={{ fontSize: '24px', marginBottom: '8px' }}>🏛️</div>
      Aucune transaction insider récente (90j) trouvée via SEC EDGAR
    </div>
  );
  return (
    <>
      {trades.map((trade, i) => (
        <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px' }}>{trade.reportingName}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
            Form 4 · {trade.filingDate}
          </div>
        </div>
      ))}
    </>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '30px' }}>
      {text}
    </div>
  );
}
