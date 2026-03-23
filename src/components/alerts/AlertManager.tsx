'use client';
import { useState, useEffect } from 'react';
import { useTradeStore } from '@/lib/store';
import { PriceAlert, AlertType } from '@/types/alerts';
import { formatPrice } from '@/lib/formatters';

function generateId() { return Math.random().toString(36).slice(2, 10); }

const ALERT_LABELS: Record<AlertType, string> = {
  price_above: 'Prix > seuil',
  price_below: 'Prix < seuil',
  change_above: 'Hausse > %',
  change_below: 'Baisse > %',
};

interface Webhooks { discord: string; telegram: string; telegramChatId: string; }

function loadWebhooks(): Webhooks {
  if (typeof window === 'undefined') return { discord: '', telegram: '', telegramChatId: '' };
  try { const v = localStorage.getItem('alert_webhooks'); return v ? JSON.parse(v) : { discord: '', telegram: '', telegramChatId: '' }; } catch { return { discord: '', telegram: '', telegramChatId: '' }; }
}
function saveWebhooks(w: Webhooks) {
  if (typeof window !== 'undefined') localStorage.setItem('alert_webhooks', JSON.stringify(w));
}

export default function AlertManager() {
  const { alerts, addAlert, removeAlert, activeSymbol } = useTradeStore();
  const [form, setForm] = useState({ symbol: activeSymbol, type: 'price_above' as AlertType, threshold: '' });
  const [showForm, setShowForm] = useState(false);
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [webhooks, setWebhooks] = useState<Webhooks>({ discord: '', telegram: '', telegramChatId: '' });

  useEffect(() => { setWebhooks(loadWebhooks()); }, []);

  function handleAdd() {
    if (!form.symbol || !form.threshold) return;
    const alert: PriceAlert = {
      id: generateId(),
      symbol: form.symbol.toUpperCase(),
      type: form.type,
      threshold: parseFloat(form.threshold),
      active: true,
      triggered: false,
      createdAt: Date.now(),
    };
    addAlert(alert);
    setShowForm(false);
    setForm({ symbol: activeSymbol, type: 'price_above', threshold: '' });

    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  function saveWebhookConfig() {
    saveWebhooks(webhooks);
    setShowWebhooks(false);
  }

  const activeAlerts = alerts.filter((a) => a.active && !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const inputStyle = { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '4px', padding: '5px 6px', color: 'var(--text-primary)', fontSize: '11px', outline: 'none', boxSizing: 'border-box' as const };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontWeight: '600', fontSize: '13px' }}>🔔 Alertes Prix</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px' }}>{activeAlerts.length} actif{activeAlerts.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => { setShowWebhooks(!showWebhooks); setShowForm(false); }} title="Webhooks Discord/Telegram" style={{ padding: '4px 8px', background: showWebhooks ? 'rgba(59,130,246,0.2)' : 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '5px', color: showWebhooks ? 'var(--accent)' : 'var(--text-muted)', fontSize: '12px', cursor: 'pointer' }}>
            🔗
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowWebhooks(false); }} style={{ padding: '4px 10px', background: 'linear-gradient(135deg, var(--accent), #60a5fa)', border: 'none', borderRadius: '5px', color: 'white', fontSize: '10px', fontWeight: '600', cursor: 'pointer' }}>
            + Alerte
          </button>
        </div>
      </div>

      {/* Webhook config */}
      {showWebhooks && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>🔗 Webhooks (alertes externes)</div>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Discord Webhook URL</div>
            <input value={webhooks.discord} onChange={(e) => setWebhooks((w) => ({ ...w, discord: e.target.value }))} placeholder="https://discord.com/api/webhooks/..." style={inputStyle} />
          </div>
          <div style={{ marginBottom: '6px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Telegram Bot Token</div>
            <input value={webhooks.telegram} onChange={(e) => setWebhooks((w) => ({ ...w, telegram: e.target.value }))} placeholder="123456:ABC-..." style={inputStyle} />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>Telegram Chat ID</div>
            <input value={webhooks.telegramChatId} onChange={(e) => setWebhooks((w) => ({ ...w, telegramChatId: e.target.value }))} placeholder="-100123456789" style={inputStyle} />
          </div>
          <button onClick={saveWebhookConfig} style={{ width: '100%', padding: '5px', background: 'var(--accent)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
            Sauvegarder
          </button>
        </div>
      )}

      {/* Add alert form */}
      {showForm && (
        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <input value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
              placeholder="AAPL" style={{ ...inputStyle, width: '70px' }} />
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AlertType }))}
              style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: '4px', padding: '5px', color: 'var(--text-primary)', fontSize: '11px' }}>
              {Object.entries(ALERT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input value={form.threshold} onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
              placeholder={form.type.includes('change') ? 'Ex: 3 (%)' : 'Ex: 250 ($)'}
              type="number" style={{ flex: 1, ...inputStyle }} />
            <button onClick={handleAdd} style={{ padding: '5px 10px', background: 'var(--accent)', border: 'none', borderRadius: '4px', color: 'white', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>OK</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {alerts.length === 0 && !showForm && !showWebhooks && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', marginTop: '20px' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔕</div>
            Aucune alerte configurée
          </div>
        )}

        {activeAlerts.map((alert) => (
          <div key={alert.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', gap: '8px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', flexShrink: 0, animation: 'pulse-dot 2s ease-in-out infinite' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>{alert.symbol}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {ALERT_LABELS[alert.type]} — {alert.type.includes('change') ? `${alert.threshold}%` : `$${formatPrice(alert.threshold)}`}
              </div>
            </div>
            <button onClick={() => removeAlert(alert.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>×</button>
          </div>
        ))}

        {triggeredAlerts.length > 0 && (
          <div style={{ padding: '6px 14px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '8px' }}>Déclenchées</div>
        )}
        {triggeredAlerts.map((alert) => (
          <div key={alert.id} style={{ display: 'flex', alignItems: 'center', padding: '7px 14px', gap: '8px', borderBottom: '1px solid var(--border)', opacity: 0.5 }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--yellow)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: '600' }}>✅ {alert.symbol}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ALERT_LABELS[alert.type]} — {alert.type.includes('change') ? `${alert.threshold}%` : `$${formatPrice(alert.threshold)}`}</div>
            </div>
            <button onClick={() => removeAlert(alert.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
