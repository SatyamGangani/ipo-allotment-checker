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

// Curated verified past & recent IPO catalog across all major Indian registrars
const HISTORICAL_IPOS: RawIpoItem[] = [
  // --- KFintech Active & Recent Issues (Automated Lookup Supported) ---
  {
    id: 'kfin_zetwerk',
    symbol: 'ZETWERK',
    name: 'ZETWERK MANUFACTURING BUSINESSES LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '29931891190',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_ssretail',
    symbol: 'SSRETAIL',
    name: 'SS RETAIL LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '50005836440',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'SME',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_fusioncx',
    symbol: 'FUSIONCX',
    name: 'FUSION CX LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '32261845640',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_vaibhav',
    symbol: 'VAIBHAV',
    name: 'VAIBHAV VYAPAAR LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '75524247020',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'SME',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_sollfege',
    symbol: 'SOLLFEGE',
    name: 'SOLLFEGE SMART ELECTRONICS LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '47651989560',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'SME',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_srit',
    symbol: 'SRIT',
    name: 'SRIT INDIA LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '37168935020',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'SME',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_orient',
    symbol: 'ORIENTCBL',
    name: 'ORIENT CABLES (INDIA) LIMITED-IPO',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '93220762680',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'SME',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_benchmark',
    symbol: 'BENCHMARK',
    name: 'BENCH MARK INFOTECH SERVICES LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '27219762590',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'SME',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_varmora',
    symbol: 'VARMORA',
    name: 'VARMORA GRANITO LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '79990817560',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_himalaya',
    symbol: 'HIMALAYA',
    name: 'HIMALAYA NUTRAVEDICS INDIA LIMITED',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    registrarCompanyId: '15174680810',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'SME',
    timePeriod: 'latest',
  },
  {
    id: 'kfin_bajajhfl',
    symbol: 'BAJAJHFL',
    name: 'Bajaj Housing Finance Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_premier',
    symbol: 'PREMIERENE',
    name: 'Premier Energies Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_western',
    symbol: 'WESTERN',
    name: 'Western Carriers (India) Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_arkade',
    symbol: 'ARKADE',
    name: 'Arkade Developers Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_northarc',
    symbol: 'NORTHARC',
    name: 'Northern Arc Capital Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_krn',
    symbol: 'KRN',
    name: 'KRN Heat Exchanger and Refrigeration Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_firstcry',
    symbol: 'FIRSTCRY',
    name: 'Brainbees Solutions Limited (FirstCry)',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_ola',
    symbol: 'OLAELEC',
    name: 'Ola Electric Mobility Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_unicommerce',
    symbol: 'UNICOMM',
    name: 'Unicommerce eSolutions Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_ixigo',
    symbol: 'IXIGO',
    name: 'Le Travenues Technology Limited (Ixigo)',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'kfin_awfis',
    symbol: 'AWFIS',
    name: 'Awfis Space Solutions Limited',
    registrar: 'KFINTECH',
    registrarName: 'KFin Technologies',
    supportType: 'manual',
    supportReason: 'Requires interactive image CAPTCHA verification',
    officialUrl: 'https://ipostatus.kfintech.com/',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },

  // --- Link Intime Past Major Issues ---
  {
    id: 'li_past_swiggy',
    symbol: 'SWIGGY',
    name: 'Swiggy Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11950',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_hyundai',
    symbol: 'HYUNDAI',
    name: 'Hyundai Motor India Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11940',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_waaree',
    symbol: 'WAAREE',
    name: 'Waaree Energies Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11942',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_afcons',
    symbol: 'AFCONS',
    name: 'Afcons Infrastructure Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11945',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_sagility',
    symbol: 'SAGILITY',
    name: 'Sagility India Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11948',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_acmesolar',
    symbol: 'ACMESOLAR',
    name: 'ACME Solar Holdings Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11949',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_nivabupa',
    symbol: 'NIVABUPA',
    name: 'Niva Bupa Health Insurance Company Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11951',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_zinka',
    symbol: 'ZINKA',
    name: 'Zinka Logistics Solutions Limited (BlackBuck)',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11953',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_ntpcgreen',
    symbol: 'NTPCGREEN',
    name: 'NTPC Green Energy Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11955',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_enviro',
    symbol: 'ENVIRO',
    name: 'Enviro Infra Engineers Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '11956',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_tatatech',
    symbol: 'TATATECH',
    name: 'Tata Technologies Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_ireda',
    symbol: 'IREDA',
    name: 'Indian Renewable Energy Development Agency (IREDA)',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_doms',
    symbol: 'DOMS',
    name: 'DOMS Industries Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_inox',
    symbol: 'INOXINDIA',
    name: 'INOX India Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_jyoticnc',
    symbol: 'JYOTICNC',
    name: 'Jyoti CNC Automation Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_exicom',
    symbol: 'EXICOM',
    name: 'Exicom Tele-Systems Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'li_past_platinum',
    symbol: 'PLATINUM',
    name: 'Platinum Industries Limited',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },

  // --- Bigshare Past Issues ---
  {
    id: 'bigshare_tolins',
    symbol: 'TOLINS',
    name: 'Tolins Tyres Limited',
    registrar: 'BIGSHARE',
    registrarName: 'Bigshare Services',
    supportType: 'manual',
    supportReason: 'Requires interactive session CAPTCHA verification',
    officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'bigshare_kross',
    symbol: 'KROSS',
    name: 'Kross Limited',
    registrar: 'BIGSHARE',
    registrarName: 'Bigshare Services',
    supportType: 'manual',
    supportReason: 'Requires interactive session CAPTCHA verification',
    officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'bigshare_diffusion',
    symbol: 'DIFFUSION',
    name: 'Diffusion Engineers Limited',
    registrar: 'BIGSHARE',
    registrarName: 'Bigshare Services',
    supportType: 'manual',
    supportReason: 'Requires interactive session CAPTCHA verification',
    officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
    issueType: 'MAINBOARD',
    timePeriod: 'past',
  },
  {
    id: 'bigshare_jaybee',
    symbol: 'JAYBEE',
    name: 'Jay Bee Laminations Limited',
    registrar: 'BIGSHARE',
    registrarName: 'Bigshare Services',
    supportType: 'manual',
    supportReason: 'Requires interactive session CAPTCHA verification',
    officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
    issueType: 'SME',
    timePeriod: 'past',
  },
  {
    id: 'bigshare_trafiksol',
    symbol: 'TRAFIKSOL',
    name: 'Trafiksol ITS Technologies Limited',
    registrar: 'BIGSHARE',
    registrarName: 'Bigshare Services',
    supportType: 'manual',
    supportReason: 'Requires interactive session CAPTCHA verification',
    officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
    issueType: 'SME',
    timePeriod: 'past',
  },
];

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

    // 6. Add Historical & Curated IPO catalog (routed by timePeriod)
    for (const hist of HISTORICAL_IPOS) {
      if (hist.timePeriod === 'latest') {
        latestIpos.push(hist);
      } else {
        pastIpos.push(hist);
      }
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
