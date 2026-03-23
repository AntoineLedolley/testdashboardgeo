'use client';
import { useEffect, useCallback } from 'react';
import { useTradeStore } from '@/lib/store';
import { PriceAlert } from '@/types/alerts';
import { StockQuote } from '@/types/stock';

function checkAlert(alert: PriceAlert, quote: StockQuote): boolean {
  if (!alert.active || alert.triggered) return false;
  switch (alert.type) {
    case 'price_above': return quote.price >= alert.threshold;
    case 'price_below': return quote.price <= alert.threshold;
    case 'change_above': return quote.changePercent >= alert.threshold;
    case 'change_below': return quote.changePercent <= alert.threshold;
    default: return false;
  }
}

function getAlertLabel(alert: PriceAlert): string {
  switch (alert.type) {
    case 'price_above': return `${alert.symbol} a franchi $${alert.threshold} à la hausse`;
    case 'price_below': return `${alert.symbol} est passé sous $${alert.threshold}`;
    case 'change_above': return `${alert.symbol} est en hausse de +${alert.threshold}%`;
    case 'change_below': return `${alert.symbol} est en baisse de ${alert.threshold}%`;
  }
}

function loadWebhooks(): { discord: string; telegram: string; telegramChatId: string } {
  if (typeof window === 'undefined') return { discord: '', telegram: '', telegramChatId: '' };
  try {
    const v = localStorage.getItem('alert_webhooks');
    return v ? JSON.parse(v) : { discord: '', telegram: '', telegramChatId: '' };
  } catch { return { discord: '', telegram: '', telegramChatId: '' }; }
}

async function sendDiscordWebhook(webhookUrl: string, message: string) {
  if (!webhookUrl) return;
  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: `🔔 **TradeAI Alert**\n${message}`, username: 'TradeAI' }),
    });
  } catch { /* ignore */ }
}

async function sendTelegramMessage(botToken: string, chatId: string, message: string) {
  if (!botToken || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: `🔔 TradeAI Alert\n${message}`, parse_mode: 'Markdown' }),
    });
  } catch { /* ignore */ }
}

export function useAlerts(quotes: Record<string, StockQuote>) {
  const { alerts, triggerAlert } = useTradeStore();

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    if (!alerts.length) return;

    for (const alert of alerts) {
      const quote = quotes[alert.symbol];
      if (!quote) continue;

      if (checkAlert(alert, quote)) {
        triggerAlert(alert.id);
        const label = getAlertLabel(alert);

        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🔔 TradeAI Alert', {
            body: label,
            icon: '/favicon.ico',
          });
        }

        // Discord / Telegram webhooks
        const webhooks = loadWebhooks();
        if (webhooks.discord) sendDiscordWebhook(webhooks.discord, label);
        if (webhooks.telegram && webhooks.telegramChatId) sendTelegramMessage(webhooks.telegram, webhooks.telegramChatId, label);
      }
    }
  }, [quotes, alerts, triggerAlert]);
}
