'use client';
import { AiMessage as AiMessageType } from '@/types/ai';

interface Props { message: AiMessageType; isStreaming?: boolean; }

// ── Table parser ──────────────────────────────────────────────────────────────
function parseTable(lines: string[]): string {
  const dataLines = lines.filter((l) => !l.match(/^\|[\s:\-|]+\|$/));
  if (dataLines.length === 0) return '';

  const parse = (line: string) =>
    line.split('|').slice(1, -1).map((c) => c.trim());

  const headers = parse(dataLines[0]);
  const rows    = dataLines.slice(1).map(parse);

  const th = headers.map((h) => `<th>${h}</th>`).join('');
  const tr = rows.map((r) =>
    `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`
  ).join('');

  return `<table class="ai-table"><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`;
}

// ── Markdown → HTML ───────────────────────────────────────────────────────────
function renderMarkdown(text: string): string {
  const lines  = text.split('\n');
  const output: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect markdown table block
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableLines: string[] = [line];
      i++;
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      output.push(parseTable(tableLines));
      continue;
    }

    // Headings
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);
    if (h3) { output.push(`<div class="md-h3">${h3[1]}</div>`); i++; continue; }
    if (h2) { output.push(`<div class="md-h2">${h2[1]}</div>`); i++; continue; }
    if (h1) { output.push(`<div class="md-h2">${h1[1]}</div>`); i++; continue; }

    // List item
    const li = line.match(/^[-*] (.+)/);
    if (li) { output.push(`<div class="md-li">${inlineFormat(li[1])}</div>`); i++; continue; }

    // Numbered list
    const ol = line.match(/^\d+\. (.+)/);
    if (ol) { output.push(`<div class="md-li">${inlineFormat(ol[1])}</div>`); i++; continue; }

    // Horizontal rule
    if (line.match(/^[-─=]{3,}$/)) { output.push('<hr class="md-hr" />'); i++; continue; }

    // Normal line
    if (line.trim()) {
      output.push(`<div class="md-p">${inlineFormat(line)}</div>`);
    } else {
      output.push('<div class="md-gap"></div>');
    }
    i++;
  }

  return output.join('');
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AiMessage({ message, isStreaming }: Props) {
  const isUser = message.role === 'user';

  return (
    <div
      className="animate-fade-in"
      style={{
        display: 'flex', flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '10px', padding: '0 12px',
      }}
    >
      <div style={{
        fontSize: '9px', color: 'var(--text-muted)', marginBottom: '3px',
        textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: '500',
      }}>
        {isUser ? 'Vous' : 'GS TradeAI'}
      </div>

      <div
        className="md-body"
        style={{
          maxWidth: '98%', padding: '9px 12px',
          borderRadius: isUser ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
          background: isUser ? 'var(--bg-hover)' : 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          fontSize: '12px', color: 'var(--text-primary)', lineHeight: '1.65',
          position: 'relative',
        }}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
      />

      {isStreaming && (
        <div style={{
          width: '6px', height: '13px', background: 'var(--accent)',
          borderRadius: '1px', marginTop: '3px', opacity: 0.7,
          animation: 'pulse-dot 0.7s ease-in-out infinite',
        }} />
      )}
    </div>
  );
}
