import type { IncomingMessage, ServerResponse } from 'http';

export interface GmpEntry {
  name: string;
  cleanName: string;
  gmp: number;
  pct: number;
  price?: number;
  indicativePrice?: number;
  lotSize?: number;
  source: string;
}

// In-memory cache for live GMP data (10 minutes TTL)
let cachedGmpList: GmpEntry[] | null = null;
let cachedGmpExpiry = 0;
const GMP_CACHE_TTL_MS = 10 * 60 * 1000;

export function cleanString(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/limited|ltd|ipo|sme|india/g, '');
}

/**
 * Scrapes live GMP from InvestorGain (https://www.investorgain.com/report/ipo-gmp-live/331/).
 * Captures name, GMP (₹), GMP (%), Issue Price, and Lot Size.
 */
async function fetchInvestorGainGmp(): Promise<GmpEntry[]> {
  const resp = await fetch('https://www.investorgain.com/report/ipo-gmp-live/331/', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!resp.ok) {
    throw new Error(`InvestorGain responded with HTTP ${resp.status}`);
  }

  const html = await resp.text();
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  const items: GmpEntry[] = [];

  for (const r of rows) {
    const rowContent = r[1];
    const nameMatch = rowContent.match(
      /data-label=["']Name["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i
    );
    const gmpMatch = rowContent.match(
      /data-label=["']GMP["'][^>]*>[\s\S]*?<b>([0-9.]+)<\/b>\s*\(([0-9.]+)%\)/i
    );
    const priceMatch = rowContent.match(
      /data-label=["']Price[^"']*["'][^>]*>[\s\S]*?<div[^>]*>([0-9.]+)<\/div>/i
    );
    const lotMatch = rowContent.match(
      /data-label=["']Lot["'][^>]*>[\s\S]*?<div[^>]*>([0-9]+)<\/div>/i
    );

    if (nameMatch && gmpMatch) {
      const name = nameMatch[1].trim();
      const gmp = parseFloat(gmpMatch[1]) || 0;
      const pct = parseFloat(gmpMatch[2]) || 0;
      const price = priceMatch ? parseFloat(priceMatch[1]) : undefined;
      const lotSize = lotMatch ? parseInt(lotMatch[1], 10) : undefined;

      items.push({
        name,
        cleanName: cleanString(name),
        gmp,
        pct,
        price,
        lotSize,
        indicativePrice: price && gmp ? price + gmp : undefined,
        source: 'InvestorGain',
      });
    }
  }

  return items;
}

/**
 * Scrapes live GMP from IPO Ji (https://www.ipoji.com/ipo-gmp).
 * Uses structured semantic data attributes rendered in their HTML table.
 */
async function fetchIpoJiGmp(): Promise<GmpEntry[]> {
  const resp = await fetch('https://www.ipoji.com/ipo-gmp', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!resp.ok) {
    throw new Error(`IPO Ji responded with HTTP ${resp.status}`);
  }

  const html = await resp.text();
  const trMatches = [...html.matchAll(/<tr[^>]*class=["'][^"']*gmp-row[^"']*["'][^>]*>/gi)];
  const results: GmpEntry[] = [];

  for (const m of trMatches) {
    const tag = m[0];
    const name = tag.match(/data-name=["']([^"']+)["']/i)?.[1]?.trim() || '';
    const gmpStr = tag.match(/data-gmp=["']([^"']*)["']/i)?.[1] || '0';
    const pctStr = tag.match(/data-pct=["']([^"']*)["']/i)?.[1] || '0';
    const indicativeStr = tag.match(/data-indicative=["']([^"']*)["']/i)?.[1] || '';

    if (name) {
      const gmp = parseFloat(gmpStr) || 0;
      const pct = parseFloat(pctStr) || 0;
      const indicativePrice = parseFloat(indicativeStr) || undefined;

      results.push({
        name,
        cleanName: cleanString(name),
        gmp,
        pct,
        indicativePrice,
        source: 'IPO Ji',
      });
    }
  }

  return results;
}

/**
 * Merges GMP data from InvestorGain and IPO Ji in parallel.
 */
async function fetchMergedGmp(): Promise<GmpEntry[]> {
  const [igResult, ipojiResult] = await Promise.allSettled([
    fetchInvestorGainGmp(),
    fetchIpoJiGmp(),
  ]);

  const map = new Map<string, GmpEntry>();

  // 1. Add InvestorGain items (richer metadata: lot size, price band)
  if (igResult.status === 'fulfilled') {
    for (const item of igResult.value) {
      map.set(item.cleanName, item);
    }
  }

  // 2. Add or enrich with IPO Ji items
  if (ipojiResult.status === 'fulfilled') {
    for (const item of ipojiResult.value) {
      const existing = map.get(item.cleanName);
      if (!existing) {
        map.set(item.cleanName, item);
      } else if (!existing.pct && item.pct) {
        // Enrich percentage if missing
        existing.pct = item.pct;
        if (item.indicativePrice) existing.indicativePrice = item.indicativePrice;
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Handler for GET /api/gmp
 */
export async function handleGetGmp(res: ServerResponse) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const now = Date.now();
  if (cachedGmpList && now < cachedGmpExpiry) {
    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: true,
        source: 'Multi-Source (cached)',
        timestamp: cachedGmpExpiry - GMP_CACHE_TTL_MS,
        items: cachedGmpList,
      })
    );
    return;
  }

  try {
    const items = await fetchMergedGmp();
    if (items.length > 0) {
      cachedGmpList = items;
      cachedGmpExpiry = now + GMP_CACHE_TTL_MS;
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          source: 'InvestorGain & IPO Ji',
          timestamp: now,
          items,
        })
      );
      return;
    }
    throw new Error('No GMP entries found from any source');
  } catch (err) {
    console.warn('[GMP-Proxy] Live GMP fetch failed, falling back:', (err as Error).message);
    if (cachedGmpList && cachedGmpList.length > 0) {
      res.writeHead(200);
      res.end(
        JSON.stringify({
          success: true,
          source: 'Stale Cache Fallback',
          items: cachedGmpList,
        })
      );
      return;
    }

    res.writeHead(200);
    res.end(
      JSON.stringify({
        success: false,
        message: 'Live GMP currently unavailable',
        items: [],
      })
    );
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }
  return handleGetGmp(res);
}
