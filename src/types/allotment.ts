export type AllotmentStatus =
  | 'allotted'
  | 'not_allotted'
  | 'not_applied'
  | 'pending'
  | 'manual_check'
  | 'error';

export interface ProfileAllotmentResult {
  profileId: string;
  profileName: string;
  pan: string;
  status: AllotmentStatus;
  allottedQuantity?: number;
  appliedQuantity?: number;
  applicantName?: string;
  message: string;
  canRetry: boolean;
  manualUrl?: string;
  checkedAt: number;
}

export interface AllotmentSummary {
  total: number;
  allotted: number;
  notAllotted: number;
  notApplied: number;
  pending: number;
  manualCheck: number;
  error: number;
}

export const STATUS_UI_CONFIG: Record<
  AllotmentStatus,
  {
    label: string;
    badgeClass: string;
    description: string;
    iconName: string;
  }
> = {
  allotted: {
    label: 'Allotted',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-emerald-500/20',
    description: 'Confirmed allotment',
    iconName: 'CheckCircle2',
  },
  not_allotted: {
    label: 'Not Allotted',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-500/10',
    description: 'Applied, but zero shares allotted',
    iconName: 'XCircle',
  },
  not_applied: {
    label: 'Not Applied',
    badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-300 ring-zinc-500/10',
    description: 'No matching application found for this PAN',
    iconName: 'MinusCircle',
  },
  pending: {
    label: 'Not Yet Available',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-300 ring-blue-500/20',
    description: 'Allotment results not yet published by the registrar',
    iconName: 'Clock',
  },
  manual_check: {
    label: 'Check Manually',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-300 ring-amber-500/20',
    description: 'Manual verification required on registrar portal',
    iconName: 'ExternalLink',
  },
  error: {
    label: 'Could Not Check',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-300 ring-rose-500/20',
    description: 'Lookup failed due to network or registrar service issue',
    iconName: 'AlertCircle',
  },
};

/**
 * Calculates a summary of result counts across all checked profiles.
 */
export function computeSummary(results: ProfileAllotmentResult[]): AllotmentSummary {
  return results.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.status === 'allotted') acc.allotted += 1;
      else if (r.status === 'not_allotted') acc.notAllotted += 1;
      else if (r.status === 'not_applied') acc.notApplied += 1;
      else if (r.status === 'pending') acc.pending += 1;
      else if (r.status === 'manual_check') acc.manualCheck += 1;
      else if (r.status === 'error') acc.error += 1;
      return acc;
    },
    {
      total: 0,
      allotted: 0,
      notAllotted: 0,
      notApplied: 0,
      pending: 0,
      manualCheck: 0,
      error: 0,
    }
  );
}

/**
 * Infers the retail lot size (in shares) from results.
 * In Indian IPOs, the minimum applied quantity across retail applications equals the 1-lot size.
 */
export function inferLotSize(results: ProfileAllotmentResult[]): number {
  const appliedList = results
    .map((r) => r.appliedQuantity)
    .filter((q): q is number => typeof q === 'number' && q > 0);
  if (appliedList.length > 0) {
    return Math.min(...appliedList);
  }
  const allottedList = results
    .map((r) => r.allottedQuantity)
    .filter((q): q is number => typeof q === 'number' && q > 0);
  if (allottedList.length > 0) {
    return Math.min(...allottedList);
  }
  return 0;
}

/**
 * Formats shares into "1 Lot (25 Shares)" or "2 Lots (50 Shares)" if lot size is known,
 * or falls back to "1 Lot (25 Shares)" if applied shares matches allotted shares.
 */
export function formatLotAndShares(shares: number, lotSize?: number): string {
  if (shares <= 0) return '0 Shares';
  const effectiveLotSize = lotSize && lotSize > 0 ? lotSize : shares;
  if (effectiveLotSize > 0 && shares >= effectiveLotSize) {
    const lots = Math.floor(shares / effectiveLotSize);
    const remainder = shares % effectiveLotSize;
    if (remainder === 0) {
      return `${lots} Lot${lots > 1 ? 's' : ''} (${shares} Shares)`;
    }
    return `${lots} Lot${lots > 1 ? 's' : ''} + ${remainder} sh. (${shares} Shares)`;
  }
  return `${shares} Shares`;
}

