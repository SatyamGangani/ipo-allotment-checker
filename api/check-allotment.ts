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

  // 3. KFintech Adapter (Direct AWS REST API - No CAPTCHA required)
  if (registrar === 'KFINTECH') {
    let resolvedClientId = companyId?.trim();
    if (!resolvedClientId && body.symbol) {
      const sym = body.symbol.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const KFIN_MAP: Record<string, string> = {
        SSRETAIL: '50005836440',
        FUSIONCX: '32261845640',
        VAIBHAV: '75524247020',
        SOLLFEGE: '47651989560',
        SRIT: '37168935020',
        ORIENTCBL: '93220762680',
        BENCHMARK: '27219762590',
        ELEVATE: '30273060190',
        VARMORA: '79990817560',
        HIMALAYA: '15174680810',
        AXIOM: '93157481460',
        SONASELECTION: '82437854510',
        KHERIA: '46596758590',
        HEROMOTORS: '49590168400',
        CENTURY: '18432822190',
        RENTOMOJO: '66907812020',
        LCC: '58236771090',
        STEAMHOUSE: '76081590190',
        VINOD: '57236082750',
        PRASOL: '75003530500',
        PRANAV: '58129803280',
        APANA: '33631182620',
        FLYHI: '40580036070',
        RAYSOFBELIEF: '60121009540',
        ASHUTOSH: '64793825640',
        SHANTI: '85357713080',
        PURPLESTYLE: '95989183810',
        ANNU: '63488567220',
        SUMAX: '29984512460',
        TEMPSENS: '61328680581',
        SHANKESH: '54923077460',
        HORIZON: '52457887480',
        CREDENT: '12562536840',
        SHIPROCKET: '86153103110',
        MILKYMIST: '29849673370',
        MOLBIO: '81387868980',
        DHOOT: '94818267561',
        ARDEE: '62198153830',
        MVELECTRO: '44065980180',
        JUNIPER: '53707331280',
        DHAVAL: '67709372110',
        MANIPAL: '43836057990',
        ADVANCE: '42817695520',
        XTRANET: '94419360500',
        SHREEBALAJI: '63734978420',
        GULFLOYDS: '19193086920',
        CALIBER: '89605487720',
        SBIFUNDS: '89468061991',
        ALPINETEX: '41422222050',
        KRATIKAL: '73206134640',
        TEJAENG: '17643901490',
        ADONAGRO: '65065971040',
        CRAZYSNACKS: '39751101520',
        CSMTECH: '89075375160',
        TURTLEMINT: '10609640970',
        CLAYCRAFT: '82984397570',
        LIOTECH: '41208427340',
        HEXAGON: '70806992450',
        VAHH: '28962929970',
        CMRGREEN: '65310715440',
        TEAMTECH: '53483362510',
        RFBL: '26859517830',
        VALUE360: '34561715130',
        ONEMI: '54450217260',
        ADISOFT: '92634312570',
        MEHUL: '80184898770',
        AMIRCHAND: '77980267280',
        CENTRALMINE: '67638044790',
        NOVUS: '26440316230',
        INNOVISION: '35015605280',
        RAJPUTANA: '43990634450',
        ACCORD: '51058840660',
        FRACTAL: '85658340220',
        AYEFINANCE: '62430336220',
        ACCRETION: '18899853180',
        KANISHK: '41087928370',
      };
      resolvedClientId = KFIN_MAP[sym];
    }

    if (!resolvedClientId) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'manual_check',
        message: 'This older KFintech issue is archived. Please verify directly on the official portal.',
        manualUrl: 'https://ipostatus.kfintech.com/',
        canRetry: false,
      }));
      return;
    }

    try {
      const resp = await fetch('https://0uz601ms56.execute-api.ap-south-1.amazonaws.com/prod/api/query?type=pan', {
        method: 'GET',
        headers: {
          reqparam: pan.trim().toUpperCase(),
          client_id: resolvedClientId,
          Referer: 'https://ipostatus.kfintech.com/',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (resp.status === 404) {
        // Record Not Found -> Not applied
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No application record found for this PAN in this issue',
          canRetry: false,
        }));
        return;
      }

      if (!resp.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: `KFintech server returned HTTP ${resp.status}`,
          canRetry: true,
        }));
        return;
      }

      const json = (await resp.json()) as {
        error?: string;
        data?: Array<{
          Name?: string;
          All_Shares?: string;
          App_Shares?: string;
          Appln_No?: string;
          DP_CLID?: string;
        }>;
      };

      if (json.error && json.error.toLowerCase().includes('not found')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No application record found for this PAN in this issue',
          canRetry: false,
        }));
        return;
      }

      if (!json.data || !Array.isArray(json.data) || json.data.length === 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No application record found for this PAN in this issue',
          canRetry: false,
        }));
        return;
      }

      let totalAllotted = 0;
      let totalApplied = 0;
      let applicantName = '';

      for (const item of json.data) {
        const allotted = parseInt(item.All_Shares || '0', 10);
        const applied = parseInt(item.App_Shares || '0', 10);
        if (!isNaN(allotted)) totalAllotted += allotted;
        if (!isNaN(applied)) totalApplied += applied;
        if (!applicantName && item.Name) applicantName = item.Name.trim();
      }

      if (totalAllotted > 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'allotted',
          allottedQuantity: totalAllotted,
          appliedQuantity: totalApplied > 0 ? totalApplied : undefined,
          applicantName,
          message: `Congratulations! Allotted ${totalAllotted} shares (${totalApplied} applied)`,
          canRetry: false,
        }));
        return;
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_allotted',
          allottedQuantity: 0,
          appliedQuantity: totalApplied > 0 ? totalApplied : undefined,
          applicantName,
          message: totalApplied > 0
            ? `Not allotted (${totalApplied} shares applied)`
            : 'Application verified on KFintech, but 0 shares allotted',
          canRetry: false,
        }));
        return;
      }
    } catch (e) {
      const err = e as Error;
      const isTimeout = err.name === 'TimeoutError' || err.message.includes('timeout');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        message: isTimeout
          ? 'KFintech response timed out'
          : `Network error connecting to KFintech: ${err.message}`,
        canRetry: true,
      }));
      return;
    }
  }

  // 4. Bigshare Services Adapter (Direct JSON Endpoint - No CAPTCHA required)
  if (registrar === 'BIGSHARE') {
    if (!companyId) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'manual_check',
        message: 'Bigshare company ID required. Please verify directly on Bigshare.',
        manualUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
        canRetry: false,
      }));
      return;
    }

    try {
      const resp = await fetch('https://ipo.bigshareonline.com/Data.aspx/FetchIpodetails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Referer': 'https://ipo.bigshareonline.com/IPO_Status.html',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: JSON.stringify({
          Applicationno: '',
          Company: companyId.trim(),
          SelectionType: 'PN',
          PanNo: pan.trim().toUpperCase(),
          txtcsdl: '',
          txtDPID: '',
          txtClId: '',
          ddlType: '0',
          lang: '1',
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!resp.ok) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'error',
          message: `Bigshare server returned HTTP ${resp.status}`,
          canRetry: true,
        }));
        return;
      }

      const json = (await resp.json()) as {
        d?: {
          Status?: string;
          Message?: string;
          DPID?: string;
          Name?: string;
          APPLIED?: string;
          ALLOTED?: string;
          MatchCount?: number;
          Records?: Array<{
            APPLICATION_NO?: string;
            DPID?: string;
            Name?: string;
            APPLIED?: string;
            ALLOTED?: string;
          }>;
        };
      };

      const result = json?.d;
      const statusText = (result?.Status || '').toUpperCase();
      const msgText = (result?.Message || '').toLowerCase();
      const dpidText = (result?.DPID || '').toLowerCase();

      // Check if not applied / not found
      if (
        statusText === 'NOTFOUND' ||
        msgText.includes('no data found') ||
        dpidText.includes('no data found') ||
        dpidText.includes('not found')
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No application record found for this PAN in this issue',
          canRetry: false,
        }));
        return;
      }

      // Check for allotments
      let totalAllotted = 0;
      let totalApplied = 0;
      let applicantName = result?.Name?.trim() || '';

      if (result?.Records && Array.isArray(result.Records) && result.Records.length > 0) {
        for (const rec of result.Records) {
          const alloted = parseInt(rec.ALLOTED || '0', 10);
          const applied = parseInt(rec.APPLIED || '0', 10);
          if (!isNaN(alloted)) totalAllotted += alloted;
          if (!isNaN(applied)) totalApplied += applied;
          if (!applicantName && rec.Name) applicantName = rec.Name.trim();
        }
      } else {
        const alloted = parseInt(result?.ALLOTED || '0', 10);
        const applied = parseInt(result?.APPLIED || '0', 10);
        if (!isNaN(alloted)) totalAllotted = alloted;
        if (!isNaN(applied)) totalApplied = applied;
      }

      if (totalAllotted > 0) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'allotted',
          allottedQuantity: totalAllotted,
          appliedQuantity: totalApplied > 0 ? totalApplied : undefined,
          applicantName,
          message: `Congratulations! Allotted ${totalAllotted} shares (${totalApplied} applied)`,
          canRetry: false,
        }));
        return;
      } else if (totalApplied > 0 || statusText === 'OK') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_allotted',
          allottedQuantity: 0,
          appliedQuantity: totalApplied > 0 ? totalApplied : undefined,
          applicantName,
          message: totalApplied > 0
            ? `Not allotted (${totalApplied} shares applied)`
            : 'Application verified on Bigshare, but 0 shares allotted',
          canRetry: false,
        }));
        return;
      } else {
        // Fallback for empty or unknown response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: result?.Message || 'No application record found for this PAN in this issue',
          canRetry: false,
        }));
        return;
      }
    } catch (e) {
      const err = e as Error;
      const isTimeout = err.name === 'TimeoutError' || err.message.includes('timeout');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        message: isTimeout
          ? 'Bigshare response timed out'
          : `Network error connecting to Bigshare: ${err.message}`,
        canRetry: true,
      }));
      return;
    }
  }

  // 5. Skyline Financial Adapter (Automated form session check)
  if (registrar === 'SKYLINE') {
    if (!companyId) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'manual_check',
        message: 'Skyline company ID required. Please verify directly on Skyline.',
        manualUrl: 'https://www.skylinerta.com/ipo.php',
        canRetry: false,
      }));
      return;
    }

    try {
      // Step 1: Get CSRF token and session cookie
      const step1 = await fetch('https://www.skylinerta.com/display_application.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: `company=${encodeURIComponent(companyId.trim())}`,
        signal: AbortSignal.timeout(8000),
      });

      const cookie = step1.headers.get('set-cookie') || '';
      const html1 = await step1.text();
      const tokenMatch = html1.match(/name="csrf_token"\s+id="csrf_token"\s+value="([^"]+)"/);

      if (!tokenMatch) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'manual_check',
          message: 'Could not obtain Skyline CSRF token. Please check on official portal.',
          manualUrl: 'https://www.skylinerta.com/ipo.php',
          canRetry: false,
        }));
        return;
      }

      // Step 2: Submit search with PAN
      const step2 = await fetch('https://www.skylinerta.com/display_application.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookie,
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: new URLSearchParams({
          csrf_token: tokenMatch[1],
          company: companyId.trim(),
          action: 'search',
          pan: pan.trim().toUpperCase(),
          client_id: '',
          application_no: '',
        }).toString(),
        signal: AbortSignal.timeout(10000),
      });

      const html2 = await step2.text();

      if (html2.includes('No record found') || html2.includes('could not find any application')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'not_applied',
          message: 'No application record found for this PAN in this issue',
          canRetry: false,
        }));
        return;
      }

      // If a result table exists, parse shares
      const tableMatch = html2.match(/<table[\s\S]*?<\/table>/i);
      if (tableMatch) {
        const text = tableMatch[0].replace(/<[^>]+>/g, ' ');
        const sharesMatch = text.match(/allot[a-z]*\s*[:=-]?\s*(\d+)/i);
        const appliedMatch = text.match(/applied\s*[:=-]?\s*(\d+)/i);
        const allotted = sharesMatch ? parseInt(sharesMatch[1], 10) : 0;
        const applied = appliedMatch ? parseInt(appliedMatch[1], 10) : 0;

        if (allotted > 0) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'allotted',
            allottedQuantity: allotted,
            appliedQuantity: applied > 0 ? applied : undefined,
            message: `Congratulations! Allotted ${allotted} shares`,
            canRetry: false,
          }));
          return;
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'not_allotted',
            allottedQuantity: 0,
            appliedQuantity: applied > 0 ? applied : undefined,
            message: 'Application verified on Skyline, but 0 shares allotted',
            canRetry: false,
          }));
          return;
        }
      }

      // Default fallback
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'not_applied',
        message: 'No application record found for this PAN in this issue',
        canRetry: false,
      }));
      return;
    } catch (e) {
      const err = e as Error;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'error',
        message: `Network error connecting to Skyline: ${err.message}`,
        canRetry: true,
      }));
      return;
    }
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
