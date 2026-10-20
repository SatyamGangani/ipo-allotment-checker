import type { IncomingMessage, ServerResponse } from 'http';

function logSafe(message: string, meta?: Record<string, unknown>) {
  const safeMeta = meta ? { ...meta } : undefined;
  if (safeMeta && 'pan' in safeMeta) {
    delete safeMeta.pan;
  }
  console.log(`[IPO-Proxy] ${message}`, safeMeta ? JSON.stringify(safeMeta) : '');
}

/**
 * Fetches the active IPO list from supported registrars and BSE.
 */
export async function handleGetIpos(res: ServerResponse) {
  try {
    const ipoList: Array<{
      id: string;
      symbol: string;
      name: string;
      registrar: string;
      registrarName: string;
      registrarCompanyId?: string;
      bseId?: string;
      supportType: 'automated' | 'manual';
      supportReason: string;
      officialUrl: string;
      issueType?: 'MAINBOARD' | 'SME' | 'DEBT';
    }> = [];

    // 1. Fetch Link Intime issues (Automated lookup supported)
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
              ipoList.push({
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
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch Link Intime IPO list:', { error: (e as Error).message });
    }

    // 2. Fetch Alankit issues (Automated lookup supported)
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
              ipoList.push({
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
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch Alankit IPO list:', { error: (e as Error).message });
    }

    // 3. Fetch BSE issues (Available for reference / manual verification)
    try {
      const bseResp = await fetch('https://api.bseindia.com/BseIndiaAPI/api/appli_check_ng/w?itype=BB', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bseindia.com/',
          'Accept': 'application/json, text/plain, */*',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (bseResp.ok) {
        const bseData = (await bseResp.json()) as { table?: any[] };
        const table = bseData?.table || [];
        for (const item of table) {
          if (item.IM_ID && item.IM_ID !== '-' && item.IPOName) {
            const nameLower = item.IPOName.toLowerCase();
            const alreadyExists = ipoList.some((existing) =>
              existing.name.toLowerCase().includes(nameLower) ||
              nameLower.includes(existing.name.toLowerCase())
            );

            if (!alreadyExists) {
              ipoList.push({
                id: `bse_${item.IM_ID}`,
                symbol: item.IPOSymbol || item.IPOName.split(/\s+/)[0].toUpperCase(),
                name: item.IPOName,
                registrar: 'BSE',
                registrarName: 'BSE India (Exchange)',
                bseId: item.IM_ID,
                supportType: 'manual',
                supportReason: 'Requires interactive browser check (Akamai Bot Protection)',
                officialUrl: 'https://www.bseindia.com/investors/appli_check.aspx',
                issueType: 'MAINBOARD',
              });
            }
          }
        }
      }
    } catch (e) {
      logSafe('Failed to fetch BSE IPO list:', { error: (e as Error).message });
    }

    // 4. Add known major registrar portals
    const knownRegistrarIssues = [
      {
        id: 'kfin_portal',
        symbol: 'KFIN-ALL',
        name: 'KFintech Active IPOs (Browse Portal)',
        registrar: 'KFINTECH',
        registrarName: 'KFin Technologies',
        supportType: 'manual' as const,
        supportReason: 'Requires interactive image CAPTCHA verification',
        officialUrl: 'https://ipostatus.kfintech.com/',
        issueType: 'MAINBOARD' as const,
      },
      {
        id: 'bigshare_portal',
        symbol: 'BIGSHARE-ALL',
        name: 'Bigshare Active IPOs (Browse Portal)',
        registrar: 'BIGSHARE',
        registrarName: 'Bigshare Services',
        supportType: 'manual' as const,
        supportReason: 'Requires interactive session CAPTCHA verification',
        officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
        issueType: 'MAINBOARD' as const,
      },
      {
        id: 'skyline_portal',
        symbol: 'SKYLINE-ALL',
        name: 'Skyline Active IPOs (Browse Portal)',
        registrar: 'SKYLINE',
        registrarName: 'Skyline Financial',
        supportType: 'manual' as const,
        supportReason: 'Requires interactive session CSRF form',
        officialUrl: 'https://www.skylinerta.com/ipo.php',
        issueType: 'SME' as const,
      },
    ];

    for (const item of knownRegistrarIssues) {
      if (!ipoList.some((existing) => existing.id === item.id)) {
        ipoList.push(item);
      }
    }

    // Sort: automated first, then alphabetical by name
    ipoList.sort((a, b) => {
      if (a.supportType === 'automated' && b.supportType !== 'automated') return -1;
      if (a.supportType !== 'automated' && b.supportType === 'automated') return 1;
      return a.name.localeCompare(b.name);
    });

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });
    res.end(JSON.stringify({ success: true, count: ipoList.length, ipos: ipoList }));
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
