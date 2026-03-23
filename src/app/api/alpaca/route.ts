import { NextRequest, NextResponse } from 'next/server';

const ALPACA_BASE = 'https://paper-api.alpaca.markets/v2';

export async function GET(req: NextRequest) {
  return proxyAlpaca(req, 'GET');
}

export async function POST(req: NextRequest) {
  return proxyAlpaca(req, 'POST');
}

export async function DELETE(req: NextRequest) {
  return proxyAlpaca(req, 'DELETE');
}

async function proxyAlpaca(req: NextRequest, method: string) {
  const apiKey = req.headers.get('x-alpaca-key') ?? '';
  const apiSecret = req.headers.get('x-alpaca-secret') ?? '';

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Alpaca credentials required' }, { status: 401 });
  }

  const path = req.nextUrl.searchParams.get('path') ?? '/account';
  const url = `${ALPACA_BASE}${path}`;

  let body: string | undefined;
  if (method === 'POST') {
    body = await req.text();
  }

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
        'Content-Type': 'application/json',
      },
      body,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error('Alpaca proxy error:', err);
    return NextResponse.json({ error: 'Alpaca API failed' }, { status: 500 });
  }
}
