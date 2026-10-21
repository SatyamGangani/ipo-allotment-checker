import { IpoItem } from '../types/ipo';

// Offline fallback in case of disconnected network
const FALLBACK_IPOS: IpoItem[] = [];


let cachedIpos: IpoItem[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes

export async function fetchIpos(forceRefresh = false): Promise<IpoItem[]> {
  const now = Date.now();
  if (!forceRefresh && cachedIpos && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedIpos;
  }

  try {
    const res = await fetch('/api/ipos');
    if (!res.ok) {
      throw new Error(`Failed to load IPOs: HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data.success && Array.isArray(data.ipos) && data.ipos.length > 0) {
      cachedIpos = data.ipos;
      lastFetchTime = now;
      return data.ipos;
    }
    throw new Error('API returned empty or invalid IPO list');
  } catch (err) {
    console.warn('Could not fetch live IPOs from /api/ipos, using verified fallback list:', err);
    if (cachedIpos && cachedIpos.length > 0) return cachedIpos;
    return FALLBACK_IPOS;
  }
}
