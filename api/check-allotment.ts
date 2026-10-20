import type { IncomingMessage, ServerResponse } from 'http';

interface CheckRequestBody {
  registrar: string;
  companyId?: string;
  pan: string;
  symbol?: string;
  bseId?: string;
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

async function parseBody(req: IncomingMessage): Promise<any> {
  const potentialBody = (req as any).body;
  if (potentialBody !== undefined && potentialBody !== null) {
    if (typeof potentialBody === 'string') {
      try {
        return JSON.parse(potentialBody);
      } catch {
        return {};
      }
    }
    return potentialBody;
  }

  return new Promise((resolve) => {
    const chunks: any[] = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => {
      try {
        const bodyStr = Buffer.concat(chunks).toString('utf-8');
        resolve(JSON.parse(bodyStr || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  // Set standard CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  try {
    const body = await parseBody(req);
    return await handleCheckAllotment(body, res);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'error', message: 'Malformed JSON payload', canRetry: false }));
  }
}
