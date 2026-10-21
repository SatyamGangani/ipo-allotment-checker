import type { IncomingMessage, ServerResponse } from 'http';

function logSafe(message: string, meta?: Record<string, unknown>) {
  const safeMeta = meta ? { ...meta } : undefined;
  if (safeMeta && 'pan' in safeMeta) {
    delete safeMeta.pan;
  }
  console.log(`[IPO-Proxy] ${message}`, safeMeta ? JSON.stringify(safeMeta) : '');
}

export interface RawIpoItem {
  id: string;
  symbol: string;
  name: string;
  registrar: 'LINKINTIME' | 'ALANKIT' | 'KFINTECH' | 'BIGSHARE' | 'SKYLINE' | 'PURVA' | 'BSE' | 'NSE' | 'OTHER';
  registrarName: string;
  registrarCompanyId?: string;
  bseId?: string;
  supportType: 'automated' | 'manual';
  supportReason: string;
  officialUrl: string;
  issueType?: 'MAINBOARD' | 'SME' | 'DEBT';
  timePeriod?: 'latest' | 'past';
  closingDate?: string;
}


/**
 * Normalizes string for deduplication comparison.
 */
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// In-memory cache for live KFintech company catalog to maintain sub-second response times
let cachedKfintechItems: RawIpoItem[] | null = null;
let cachedKfintechExpiry = 0;
const KFINTECH_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

async function fetchKfintechLiveIpos(): Promise<RawIpoItem[]> {
  const now = Date.now();
  if (cachedKfintechItems && now < cachedKfintechExpiry) {
    return cachedKfintechItems;
  }

  try {
    const htmlResp = await fetch('https://ipostatus.kfintech.com/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!htmlResp.ok) {
      logSafe('Failed to fetch KFintech home page:', { status: htmlResp.status });
      return cachedKfintechItems || [];
    }

    const html = await htmlResp.text();
    const scriptMatch = html.match(/src=["']((?:\.\/)?static\/js\/main\.[a-z0-9]+\.js)["']/i);
    if (!scriptMatch) {
      logSafe('Could not locate KFintech main JS bundle script in HTML');
      return cachedKfintechItems || [];
    }

    const scriptPath = scriptMatch[1].replace(/^\.\//, '');
    const scriptUrl = `https://ipostatus.kfintech.com/${scriptPath}`;

    const jsResp = await fetch(scriptUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://ipostatus.kfintech.com/',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!jsResp.ok) {
      logSafe('Failed to fetch KFintech JS bundle:', { status: jsResp.status });
      return cachedKfintechItems || [];
    }

    const jsText = await jsResp.text();
    const match =
      jsText.match(/rf=JSON\.parse\(\x27(\[\{.*?\}\])\x27\)/) ||
      jsText.match(/JSON\.parse\(\x27(\[\{"clientId".*?\}\])\x27\)/);

    if (!match) {
      logSafe('Could not extract JSON company list from KFintech bundle');
      return cachedKfintechItems || [];
    }

    const list = JSON.parse(match[1]) as Array<{ clientId: string; name: string }>;
    if (!Array.isArray(list)) {
      return cachedKfintechItems || [];
    }

    const items: RawIpoItem[] = [];
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      const compId = entry.clientId?.trim();
      const compName = entry.name?.trim();
      if (!compId || !compName) continue;

      const isSme = compName.toUpperCase().includes('SME');
      const isDebt = compName.toUpperCase().includes('NCD') || compName.toUpperCase().includes('BONDS');
      const symbolGuess = compName.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
      // Top 8-10 issues on KFintech portal are active/recent issues, the rest are past
      const isRecent = i <= 8;

      items.push({
        id: `kfin_${compId}`,
        symbol: symbolGuess || compName.slice(0, 8).toUpperCase(),
        name: compName,
        registrar: 'KFINTECH',
        registrarName: 'KFin Technologies',
        registrarCompanyId: compId,
        supportType: 'automated',
        supportReason: 'Direct automated PAN lookup supported',
        officialUrl: 'https://ipostatus.kfintech.com/',
        issueType: isDebt ? 'DEBT' : isSme ? 'SME' : 'MAINBOARD',
        timePeriod: isRecent ? 'latest' : 'past',
      });
    }

    cachedKfintechItems = items;
    cachedKfintechExpiry = now + KFINTECH_CACHE_TTL_MS;
    logSafe(`Successfully scraped and cached ${items.length} live KFintech IPOs`);
    return items;
  } catch (err) {
    logSafe('Failed to fetch dynamic KFintech IPO catalog:', { error: (err as Error).message });
    return cachedKfintechItems || [];
  }
}

/**
 * Fetches the active IPO list from supported registrars and BSE/NSE.
 * Puts latest/active IPOs on top, followed by past IPOs.
 */
export async function handleGetIpos(res: ServerResponse) {
  try {
    const latestIpos: RawIpoItem[] = [];
    const pastIpos: RawIpoItem[] = [];

    // 1. Fetch Link Intime live active issues (Automated lookup supported)
    try {
      const liResp = await fetch('https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/GetDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        signal: AbortSignal.timeout(8000),
      });

      if (liResp.ok) {
        const liJson = (await liResp.json()) as { d?: string };
        const xml = liJson.d || '';
        const tableRegex = /<Table>([\s\S]*?)<\/Table>/g;
        let match;
        while ((match = tableRegex.exec(xml)) !== null) {
          const content = match[1];
          const idMatch = content.match(/<company_id>(.*?)<\/company_id>/);
          const nameMatch = content.match(/<companyname>(.*?)<\/companyname>/);
          if (idMatch && nameMatch) {
            const id = idMatch[1].trim();
            const name = nameMatch[1].trim();
            if (id && name) {
              const isSme = name.toUpperCase().includes('SME');
              const symbolGuess = name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
              latestIpos.push({
                id: `li_${id}`,
                symbol: symbolGuess || name.slice(0, 8).toUpperCase(),
                name,
                registrar: 'LINKINTIME',
                registrarName: 'Link Intime',
                registrarCompanyId: id,
                supportType: 'automated',
                supportReason: 'Direct automated PAN lookup supported',
                officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
                issueType: isSme ? 'SME' : 'MAINBOARD',
                timePeriod: 'latest',
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch Link Intime IPO list:', { error: (e as Error).message });
    }

    // 2. Fetch Alankit live active issues (Automated lookup supported)
    try {
      const alankitResp = await fetch('https://ipo.alankit.com/Query/companylist', {
        signal: AbortSignal.timeout(8000),
      });
      if (alankitResp.ok) {
        const alankitData = await alankitResp.json();
        if (Array.isArray(alankitData)) {
          for (const item of alankitData) {
            const id = item.CompanyCode;
            const name = item.CompanyName;
            if (id && name) {
              const category = item.Category || 'MAINBOARD';
              const symbolGuess = name.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
              latestIpos.push({
                id: `alankit_${id}`,
                symbol: symbolGuess || name.slice(0, 8).toUpperCase(),
                name,
                registrar: 'ALANKIT',
                registrarName: 'Alankit Assignments',
                registrarCompanyId: id,
                supportType: 'automated',
                supportReason: 'Direct automated PAN lookup supported',
                officialUrl: 'https://ipo.alankit.com/',
                issueType: category === 'NCD' ? 'DEBT' : category === 'SME' ? 'SME' : 'MAINBOARD',
                timePeriod: 'latest',
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch Alankit IPO list:', { error: (e as Error).message });
    }

    // 3. Fetch Bigshare live dropdown list (contains 15+ real current & recent companies)
    try {
      const bigshareResp = await fetch('https://ipo.bigshareonline.com/IPO_Status.html', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (bigshareResp.ok) {
        const html = await bigshareResp.text();
        const selectMatch = html.match(/<select[^>]*id=["']?ddlCompany["']?[^>]*>([\s\S]*?)<\/select>/i);
        if (selectMatch) {
          const options = [...selectMatch[1].matchAll(/<option[^>]*value=["']?([^"'>]+)["']?[^>]*>([^<]+)<\/option>/gi)];
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const compId = opt[1]?.trim();
            const compName = opt[2]?.trim();
            if (compId && compName && !compName.toLowerCase().includes('select company')) {
              const isSme = compName.toUpperCase().includes('SME');
              const symbolGuess = compName.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
              // First 5 in the dropdown are latest active issues, subsequent ones are past
              const isRecent = i <= 5;
              const targetList = isRecent ? latestIpos : pastIpos;
              targetList.push({
                id: `bigshare_${compId}`,
                symbol: symbolGuess || compName.slice(0, 8).toUpperCase(),
                name: compName,
                registrar: 'BIGSHARE',
                registrarName: 'Bigshare Services',
                registrarCompanyId: compId,
                supportType: 'automated',
                supportReason: 'Direct automated PAN lookup supported',
                officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
                issueType: isSme ? 'SME' : 'MAINBOARD',
                timePeriod: isRecent ? 'latest' : 'past',
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch Bigshare IPO list:', { error: (e as Error).message });
    }

    // 4. Fetch Skyline live dropdown list (Automated lookup supported)
    try {
      const skylineResp = await fetch('https://www.skylinerta.com/ipo.php', {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (skylineResp.ok) {
        const html = await skylineResp.text();
        const selectMatch = html.match(/<select[^>]*id=["']?company["']?[^>]*>([\s\S]*?)<\/select>/i);
        if (selectMatch) {
          const options = [...selectMatch[1].matchAll(/<option[^>]*value=["']?([^"'>]+)["']?[^>]*>([^<]+)<\/option>/gi)];
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const compId = opt[1]?.trim();
            const compName = opt[2]?.trim();
            if (compId && compName && !compName.toLowerCase().includes('select company')) {
              const isSme = compName.toUpperCase().includes('LIMITED') || compName.toUpperCase().includes('LTD');
              const symbolGuess = compName.split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
              const isRecent = i <= 5;
              const targetList = isRecent ? latestIpos : pastIpos;
              targetList.push({
                id: `skyline_${compId}`,
                symbol: symbolGuess || compName.slice(0, 8).toUpperCase(),
                name: compName,
                registrar: 'SKYLINE',
                registrarName: 'Skyline Financial',
                registrarCompanyId: compId,
                supportType: 'automated',
                supportReason: 'Direct automated PAN lookup supported',
                officialUrl: 'https://www.skylinerta.com/ipo.php',
                issueType: isSme ? 'SME' : 'MAINBOARD',
                timePeriod: isRecent ? 'latest' : 'past',
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch Skyline IPO list:', { error: (e as Error).message });
    }

    // 4. Fetch NSE India live/current issues API
    try {
      const nseResp = await fetch('https://www.nseindia.com/api/ipo-current-issue', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (nseResp.ok) {
        const nseData = (await nseResp.json()) as any[];
        if (Array.isArray(nseData)) {
          for (const item of nseData) {
            if (item.companyName && item.symbol) {
              const isClosed = item.status && item.status.toLowerCase().includes('closed');
              const targetList = isClosed ? pastIpos : latestIpos;
              targetList.push({
                id: `nse_${item.symbol.toLowerCase()}`,
                symbol: item.symbol,
                name: item.companyName,
                registrar: 'NSE',
                registrarName: 'NSE India',
                supportType: 'manual',
                supportReason: 'Requires interactive investor verification on NSE',
                officialUrl: 'https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids',
                issueType: item.series === 'SM' ? 'SME' : 'MAINBOARD',
                timePeriod: isClosed ? 'past' : 'latest',
                closingDate: item.issueEndDate || undefined,
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch NSE IPO list:', { error: (e as Error).message });
    }

    // 5. Fetch KFintech live dynamic issues (Automated lookup supported)
    try {
      const kfinItems = await fetchKfintechLiveIpos();
      for (const item of kfinItems) {
        if (item.timePeriod === 'latest') {
          latestIpos.push(item);
        } else {
          pastIpos.push(item);
        }
      }
    } catch (e) {
      logSafe('Failed to process KFintech live IPOs:', { error: (e as Error).message });
    }

    // Deduplicate: If an IPO exists in latest, do NOT duplicate in past.
    // Also deduplicate within latest and within past by normalized name.
    const seenLatest = new Set<string>();
    const uniqueLatest: RawIpoItem[] = [];

    for (const ipo of latestIpos) {
      const norm = normalizeName(ipo.name);
      if (!seenLatest.has(norm)) {
        seenLatest.add(norm);
        uniqueLatest.push(ipo);
      }
    }

    const seenPast = new Set<string>(seenLatest);
    const uniquePast: RawIpoItem[] = [];

    for (const ipo of pastIpos) {
      const norm = normalizeName(ipo.name);
      if (!seenPast.has(norm)) {
        seenPast.add(norm);
        uniquePast.push(ipo);
      }
    }

    // Sort Latest: automated check first, then alphabetical
    uniqueLatest.sort((a, b) => {
      if (a.supportType === 'automated' && b.supportType !== 'automated') return -1;
      if (a.supportType !== 'automated' && b.supportType === 'automated') return 1;
      return a.name.localeCompare(b.name);
    });

    // Sort Past: automated check first, then alphabetical
    uniquePast.sort((a, b) => {
      if (a.supportType === 'automated' && b.supportType !== 'automated') return -1;
      if (a.supportType !== 'automated' && b.supportType === 'automated') return 1;
      return a.name.localeCompare(b.name);
    });

    // Combine: LATEST ALWAYS ON TOP, PAST IMMEDIATELY BELOW
    const combinedIpos = [...uniqueLatest, ...uniquePast];

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(JSON.stringify({
      success: true,
      count: combinedIpos.length,
      latestCount: uniqueLatest.length,
      pastCount: uniquePast.length,
      ipos: combinedIpos,
    }));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: false, error: 'Internal server error while discovering IPOs' }));
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set standard CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  return handleGetIpos(res);
}
