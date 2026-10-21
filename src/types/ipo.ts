export type RegistrarCode =
  | 'LINKINTIME'
  | 'ALANKIT'
  | 'KFINTECH'
  | 'BIGSHARE'
  | 'SKYLINE'
  | 'PURVA'
  | 'BSE'
  | 'NSE'
  | 'OTHER';

export type IpoSupportType = 'automated' | 'manual';

export type IpoTimePeriod = 'latest' | 'past';

export interface IpoItem {
  id: string;
  symbol: string;
  name: string;
  registrar: RegistrarCode;
  registrarName: string;
  registrarCompanyId?: string;
  bseId?: string;
  supportType: IpoSupportType;
  supportReason: string;
  officialUrl: string;
  issueType?: 'MAINBOARD' | 'SME' | 'DEBT';
  statusAvailable?: boolean;
  timePeriod?: IpoTimePeriod;
  closingDate?: string;
}

export const REGISTRAR_META: Record<
  RegistrarCode,
  {
    name: string;
    supportType: IpoSupportType;
    reason: string;
    officialUrl: string;
    badgeColor: string;
  }
> = {
  LINKINTIME: {
    name: 'Link Intime',
    supportType: 'automated',
    reason: 'Direct API supported without CAPTCHA',
    officialUrl: 'https://in.mpms.mufg.com/Initial_Offer/public-issues.html',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  ALANKIT: {
    name: 'Alankit Assignments',
    supportType: 'automated',
    reason: 'Direct API supported without CAPTCHA',
    officialUrl: 'https://ipo.alankit.com/',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  KFINTECH: {
    name: 'KFin Technologies',
    supportType: 'automated',
    reason: 'Direct API supported without CAPTCHA',
    officialUrl: 'https://ipostatus.kfintech.com/',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  BIGSHARE: {
    name: 'Bigshare Services',
    supportType: 'automated',
    reason: 'Direct API supported without CAPTCHA',
    officialUrl: 'https://ipo.bigshareonline.com/IPO_Status.html',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  SKYLINE: {
    name: 'Skyline Financial',
    supportType: 'automated',
    reason: 'Direct API supported without CAPTCHA',
    officialUrl: 'https://www.skylinerta.com/ipo.php',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  PURVA: {
    name: 'Purva Sharegistry',
    supportType: 'manual',
    reason: 'Interactive form required',
    officialUrl: 'https://www.purvashare.com/investor-service/ipo-query',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
  },
  BSE: {
    name: 'BSE India',
    supportType: 'manual',
    reason: 'Protected by Akamai WAF / Bot Manager',
    officialUrl: 'https://www.bseindia.com/investors/appli_check.aspx',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
  },
  NSE: {
    name: 'NSE India',
    supportType: 'manual',
    reason: 'Requires reCAPTCHA v3 and investor login',
    officialUrl: 'https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids',
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
  },
  OTHER: {
    name: 'Official Registrar',
    supportType: 'manual',
    reason: 'Manual verification on registrar website required',
    officialUrl: 'https://www.sebi.gov.in/',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
  },
};
