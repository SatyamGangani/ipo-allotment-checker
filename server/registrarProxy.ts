import type { ServerResponse } from 'http';

interface CheckRequestBody {
  registrar: string;
  companyId?: string;
  pan: string;
  symbol?: string;
  bseId?: string;
}

/**
 * Sanitizes logs to ensure PAN numbers are NEVER logged or stored.
 */
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
            // Check if already covered by automated registrar
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

    // 4. Add known major registrar portals (e.g. KFintech & Bigshare current issues)
    // To ensure comprehensive registrar representation:
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

/**
 * Handles PAN allotment check for a specific registrar.
 * Strictly zero persistence or logging of PAN.
 */
export async function handleCheckAllotment(body: CheckRequestBody, res: ServerResponse) {
  const { registrar, companyId, pan } = body;

  if (!pan || !registrar) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'error',
      message: 'Missing required parameters (registrar, pan)',
      canRetry: false,
    }));
    return;
  }

  // 1. Link Intime Adapter
  if (registrar === 'LINKINTIME') {
    if (!companyId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        message: 'Link Intime requires companyId',
        canRetry: false,
      }));
      return;
    }

    try {
      const resp = await fetch('https://in.mpms.mufg.com/Initial_Offer/IPO.aspx/SearchOnPan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=utf-8' },
        body: JSON.stringify({
          clientid: companyId,
          PAN: pan,
          IFSC: '',
          CHKVAL: '1',
          token: '',
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!resp.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: `Link Intime server returned HTTP ${resp.status}`,
          canRetry: true,
        }));
        return;
      }

      const data = (await resp.json()) as { d?: string };
      const xml = data?.d || '';

      // Check if dataset is empty -> Not applied
      if (!xml.includes('<Table>')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No application record found for this PAN in this issue',
          canRetry: false,
        }));
        return;
      }

      // Parse XML records
      const tableRegex = /<Table>([\s\S]*?)<\/Table>/g;
      let match;
      let foundRecord = false;
      let totalAllotted = 0;
      let totalApplied = 0;
      let applicantName = '';

      while ((match = tableRegex.exec(xml)) !== null) {
        const tableContent = match[1];
        const nameMatch = tableContent.match(/<NAME1>(.*?)<\/NAME1>/);
        const dpIdMatch = tableContent.match(/<DPCLITID>(.*?)<\/DPCLITID>/);
        const allotMatch = tableContent.match(/<ALLOT>(.*?)<\/ALLOT>/);
        const sharesMatch = tableContent.match(/<SHARES>(.*?)<\/SHARES>/);

        const name = nameMatch ? nameMatch[1].trim() : '';
        const dpId = dpIdMatch ? dpIdMatch[1].trim() : '';
        const allot = allotMatch ? parseInt(allotMatch[1], 10) : 0;
        const shares = sharesMatch ? parseInt(sharesMatch[1], 10) : 0;

        // Skip dummy rows
        if (!name && (!dpId || dpId === '1200000000000000' || dpId === '1234567890123456') && allot === 0) {
          continue;
        }

        foundRecord = true;
        totalAllotted += isNaN(allot) ? 0 : allot;
        totalApplied += isNaN(shares) ? 0 : shares;
        if (!applicantName && name) applicantName = name;
      }

      if (!foundRecord) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No valid allotment record found for this PAN',
          canRetry: false,
        }));
        return;
      }

      if (totalAllotted > 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'allotted',
          allottedQuantity: totalAllotted,
          appliedQuantity: totalApplied > 0 ? totalApplied : undefined,
          applicantName: applicantName || undefined,
          message: `Congratulations! Allotted ${totalAllotted} share${totalAllotted > 1 ? 's' : ''}`,
          canRetry: false,
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_allotted',
          allottedQuantity: 0,
          appliedQuantity: totalApplied > 0 ? totalApplied : undefined,
          applicantName: applicantName || undefined,
          message: `Application found (${totalApplied > 0 ? `${totalApplied} shares applied` : 'bid verified'}), but no shares were allotted`,
          canRetry: false,
        }));
      }
      return;
    } catch (e) {
      const err = e as Error;
      const isTimeout = err.name === 'TimeoutError' || err.message.includes('timeout');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        message: isTimeout
          ? 'Link Intime response timed out after 12 seconds'
          : `Network error connecting to Link Intime: ${err.message}`,
        canRetry: true,
      }));
      return;
    }
  }

  // 2. Alankit Adapter
  if (registrar === 'ALANKIT') {
    if (!companyId) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        message: 'Alankit requires companyId',
        canRetry: false,
      }));
      return;
    }

    try {
      const resp = await fetch('https://ipo.alankit.com/Query/GetQueryResult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          CompCode: companyId,
          SearchParam: 'PANNO',
          SearchValue: pan,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!resp.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: `Alankit server returned HTTP ${resp.status}`,
          canRetry: true,
        }));
        return;
      }

      const data = await resp.json();
      if (!Array.isArray(data) || data.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No matching application found on Alankit for this PAN',
          canRetry: false,
        }));
        return;
      }

      const record = data[0];
      const allotted = parseInt(record.ALLOTED || '0', 10);
      const applied = parseInt(record.APPLIED || '0', 10);
      const applicantName = record.NAME && record.NAME !== 'NULL' ? record.NAME : undefined;

      if (allotted > 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'allotted',
          allottedQuantity: allotted,
          appliedQuantity: applied > 0 ? applied : undefined,
          applicantName,
          message: `Congratulations! Allotted ${allotted} share${allotted > 1 ? 's' : ''}`,
          canRetry: false,
        }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_allotted',
          allottedQuantity: 0,
          appliedQuantity: applied > 0 ? applied : undefined,
          applicantName,
          message: 'Application verified on Alankit, but 0 shares allotted',
          canRetry: false,
        }));
      }
      return;
    } catch (e) {
      const err = e as Error;
      const isTimeout = err.name === 'TimeoutError' || err.message.includes('timeout');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        message: isTimeout
          ? 'Alankit response timed out'
          : `Network error connecting to Alankit: ${err.message}`,
        canRetry: true,
      }));
      return;
    }
  }

  // 3. Registrars requiring manual interaction due to CAPTCHA or WAF:
  if (registrar === 'KFINTECH') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'manual_check',
      message: 'KFintech requires image CAPTCHA verification. Please verify directly on the official portal.',
      manualUrl: 'https://ipostatus.kfintech.com/',
      canRetry: false,
    }));
    return;
  }

  if (registrar === 'BIGSHARE') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'manual_check',
      message: 'Bigshare enforces session CAPTCHA verification. Please verify directly on Bigshare.',
      manualUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
      canRetry: false,
    }));
    return;
  }

  if (registrar === 'BSE') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'manual_check',
      message: 'BSE India is protected by Akamai Bot Manager (WAF). Please check directly on BSE.',
      manualUrl: 'https://www.bseindia.com/investors/appli_check.aspx',
      canRetry: false,
    }));
    return;
  }

  if (registrar === 'NSE') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'manual_check',
      message: 'NSE India requires reCAPTCHA v3 and registered investor login. Check directly on NSE.',
      manualUrl: 'https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids',
      canRetry: false,
    }));
    return;
  }

  if (registrar === 'SKYLINE') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'manual_check',
      message: 'Skyline Financial requires an interactive session form. Check directly on Skyline.',
      manualUrl: 'https://www.skylinerta.com/ipo.php',
      canRetry: false,
    }));
    return;
  }

  if (registrar === 'PURVA') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'manual_check',
      message: 'Purva Sharegistry requires manual query form. Check directly on Purva.',
      manualUrl: 'https://www.purvashare.com/investor-service/ipo-query',
      canRetry: false,
    }));
    return;
  }

  // Fallback for unknown registrar
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'manual_check',
    message: `Automated lookup is not available for registrar ${registrar || 'unknown'}. Please verify manually.`,
    manualUrl: 'https://www.sebi.gov.in/',
    canRetry: false,
  }));
}
