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

export interface GmpApiResponse {
  success: boolean;
  source?: string;
  timestamp?: number;
  items: GmpEntry[];
  message?: string;
}

let cachedGmp: GmpEntry[] | null = null;
let lastFetchTime = 0;
const GMP_CACHE_MS = 5 * 60 * 1000; // 5 mins in browser

export function normalizeIpoName(str: string): string {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/limited|ltd|ipo|sme|india/g, '');
}

/**
 * Fetch live merged GMP from InvestorGain & IPO Ji via backend proxy.
 */
export async function fetchGmpList(forceRefresh = false): Promise<GmpEntry[]> {
  const now = Date.now();
  if (!forceRefresh && cachedGmp && now - lastFetchTime < GMP_CACHE_MS) {
    return cachedGmp;
  }

  try {
    const url =
      typeof window !== 'undefined' && window.location?.origin
        ? `${window.location.origin}/api/gmp`
        : '/api/gmp';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data: GmpApiResponse = await res.json();
    if (data.success && Array.isArray(data.items)) {
      cachedGmp = data.items;
      lastFetchTime = now;
      return data.items;
    }
    return cachedGmp || [];
  } catch (err) {
    console.warn('[gmpService] Failed to fetch live GMP:', err);
    return cachedGmp || [];
  }
}

/**
 * Smart matching algorithm to pair registrar IPO name with live GMP scraper entry.
 */
export function findGmpForIpo(
  ipoName: string | undefined | null,
  gmpList: GmpEntry[]
): GmpEntry | null {
  if (!ipoName || !gmpList || gmpList.length === 0) return null;

  const clean = normalizeIpoName(ipoName);
  if (!clean) return null;

  // 1. Direct or substring match
  const direct = gmpList.find((item) => {
    if (!item.cleanName) return false;
    return clean === item.cleanName || clean.includes(item.cleanName) || item.cleanName.includes(clean);
  });
  if (direct) return direct;

  // 2. Tokenized word overlap (e.g. "Bonfiglioli Transmissions Limited - IPO" -> ["bonfiglioli", "transmissions"])
  const tokens = ipoName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['limited', 'ltd', 'ipo', 'sme', 'india'].includes(w));

  if (tokens.length > 0) {
    const match = gmpList.find((item) => {
      const itemClean = item.cleanName;
      // Match if at least first main token or 2 tokens match
      return tokens.some((token) => itemClean.includes(token));
    });
    if (match) return match;
  }

  return null;
}
