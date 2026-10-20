import { IpoItem } from '../types/ipo';

// Curated fallback in case backend or external network is completely disconnected
const FALLBACK_IPOS: IpoItem[] = [
  {
    id: 'li_fallback_1',
    symbol: 'RAVITA',
    name: 'Ravita Engineering Services Limited - SME IPO',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11965',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'SME',
  },
  {
    id: 'alankit_fallback_1',
    symbol: 'PAISALO',
    name: 'PAISALO DIGITAL LIMITED',
    registrar: 'ALANKIT',
    registrarName: 'Alankit Assignments',
    registrarCompanyId: 'COMP112',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipo.alankit.com/',
    issueType: 'DEBT',
  },
  {
    id: 'kfin_portal',
    symbol: 'KFINTECH',
    name: 'KFintech Active IPOs (Browse Portal)',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
  },
  {
    id: 'bigshare_portal',
    symbol: 'BIGSHARE',
    name: 'Bigshare Active IPOs (Browse Portal)',
    registrar: 'BIGSHARE',
    registrarName: 'Bigshare Services',
    supportType: 'manual',
    supportReason: 'Requires interactive session CAPTCHA verification',
    officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
    issueType: 'MAINBOARD',
  },
  {
    id: 'bse_portal',
    symbol: 'BSE-BB',
    name: 'BSE India Equity Book Building Issues',
    registrar: 'BSE',
    registrarName: 'BSE India (Exchange)',
    supportType: 'manual',
    supportReason: 'Protected by Akamai WAF; check directly on BSE',
    officialUrl: 'https://www.bseindia.com/investors/appli_check.aspx',
    issueType: 'MAINBOARD',
  },
];

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
