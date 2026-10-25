import React from 'react';
import { Flame, TrendingUp, DollarSign, Layers, CheckCircle2, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { IpoItem } from '../types/ipo';
import { GmpEntry } from '../services/gmpService';

interface GmpMarketCardProps {
  selectedIpo: IpoItem | null;
  gmpEntry: GmpEntry | null;
  isLoading?: boolean;
}

export const GmpMarketCard: React.FC<GmpMarketCardProps> = ({
  selectedIpo,
  gmpEntry,
  isLoading = false,
}) => {
  if (!selectedIpo) return null;

  const lotSize = gmpEntry?.lotSize || 25; // standard retail lot fallback
  const isListed = !!gmpEntry?.isListed;

  // Case 1: IPO is already LISTED on stock exchange (BSE / NSE)
  if (gmpEntry && isListed) {
    const listingPrice = gmpEntry.listingPrice ?? (gmpEntry.price || 0);
    const issuePrice = gmpEntry.price ?? listingPrice;
    const gainPct = gmpEntry.listingGainPct ?? (issuePrice > 0 ? ((listingPrice - issuePrice) / issuePrice) * 100 : 0);
    const gainPerShare = gmpEntry.listingGainPerShare ?? (listingPrice - issuePrice);
    const profitPerLot = Math.round(gainPerShare * lotSize);
    const isPositive = gainPct > 0;
    const isFlat = gainPct === 0;

    return (
      <div className="bg-white rounded-2xl border border-blue-200/90 shadow-sm overflow-hidden transition-all">
        {/* Header Bar */}
        <div className="px-4 py-3 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 border-b border-blue-100 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Official Listing Performance
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                  LISTED {gmpEntry.listingDate ? `• ${gmpEntry.listingDate.toUpperCase()}` : ''}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                {selectedIpo.name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Official Debut via {gmpEntry.source}</span>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
            {/* Metric 1: Actual Listing Day Gain (% Priority) */}
            <div
              className={`p-3 sm:p-3.5 rounded-xl border ${
                isPositive
                  ? 'bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border-emerald-200/80 text-emerald-800'
                  : isFlat
                  ? 'bg-slate-50 border-slate-200/80 text-slate-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Listing Gain (%)
                </span>
                {isPositive ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                ) : isFlat ? (
                  <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                )}
              </div>
              <div
                className={`text-xl sm:text-2xl font-black tracking-tight ${
                  isPositive ? 'text-emerald-700' : isFlat ? 'text-slate-800' : 'text-rose-700'
                }`}
              >
                {gainPct > 0 ? `+${gainPct.toFixed(1)}%` : `${gainPct.toFixed(1)}%`}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                {isFlat ? 'Flat market debut' : 'Debut day return'}
              </div>
            </div>

            {/* Metric 2: Actual Listing Price */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Listed At
                </span>
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                ₹{listingPrice}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                BSE / NSE debut price
              </div>
            </div>

            {/* Metric 3: Issue Price */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Issue Price
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Base</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {issuePrice ? `₹${issuePrice}` : '—'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Allotment price band
              </div>
            </div>

            {/* Metric 4: Listing Gain (₹ per share) */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Gain / Share
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <div
                className={`text-xl sm:text-2xl font-bold tracking-tight ${
                  gainPerShare > 0
                    ? 'text-emerald-700'
                    : gainPerShare === 0
                    ? 'text-slate-800'
                    : 'text-rose-700'
                }`}
              >
                {gainPerShare > 0
                  ? `+₹${gainPerShare}`
                  : gainPerShare === 0
                  ? '₹0'
                  : `-₹${Math.abs(gainPerShare)}`}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Debut gain per share
              </div>
            </div>
          </div>

          {/* Retail Lot Profit Strip */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-700">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>
                Standard Retail Lot: <strong>1 Lot ({lotSize} Shares)</strong>
                {issuePrice > 0 && (
                  <span className="text-slate-500 ml-1">
                    (~₹{(issuePrice * lotSize).toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 font-semibold">
              <span className="text-slate-600">Debut Profit / Retail Lot:</span>
              <span
                className={`px-2 py-0.5 rounded-md font-bold ${
                  profitPerLot > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : profitPerLot === 0
                    ? 'bg-slate-100 text-slate-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {profitPerLot > 0
                  ? `+₹${profitPerLot.toLocaleString('en-IN')}`
                  : profitPerLot === 0
                  ? '₹0'
                  : `-₹${Math.abs(profitPerLot).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center space-x-1.5 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
            <span>
              This share is officially listed and trading on the stock exchange. Grey Market Premium (GMP) is no longer applicable.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Unlisted IPO with Active GMP
  const profitPerLot = gmpEntry?.gmp ? Math.round(gmpEntry.gmp * lotSize) : 0;
  const isPositive = (gmpEntry?.gmp ?? 0) > 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${isPositive ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            <Flame className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Live Grey Market Premium (GMP)
              </h3>
              {isPositive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 animate-pulse">
                  ACTIVE
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
              {selectedIpo.name}
            </p>
          </div>
        </div>

        {gmpEntry ? (
          <div className="flex items-center space-x-1.5 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Live via {gmpEntry.source}</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-400">
            {isLoading ? 'Fetching live GMP...' : 'Checked against InvestorGain & IPO Ji'}
          </span>
        )}
      </div>

      {/* Main Content Area */}
      {gmpEntry && isPositive ? (
        <div className="p-4 sm:p-5">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
            {/* Metric 1: Expected Listing Gain (% Priority) */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-200/80">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Expected Gain (%)
                </span>
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-700 tracking-tight">
                +{gmpEntry.pct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-emerald-600/90 font-medium mt-0.5">
                Priority % return
              </div>
            </div>

            {/* Metric 2: Live GMP (₹ per share) */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  GMP (₹ / share)
                </span>
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                +₹{gmpEntry.gmp}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Grey market premium
              </div>
            </div>

            {/* Metric 3: Issue Price */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Issue Price
                </span>
                <span className="text-[10px] font-semibold text-slate-400">Base</span>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-800 tracking-tight">
                {gmpEntry.price ? `₹${gmpEntry.price}` : '—'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Price band cap
              </div>
            </div>

            {/* Metric 4: Est. Listing Price */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-600 mb-1">
                <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider">
                  Est. Listing Price
                </span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {gmpEntry.indicativePrice
                  ? `₹${gmpEntry.indicativePrice}`
                  : gmpEntry.price
                  ? `₹${gmpEntry.price + gmpEntry.gmp}`
                  : `+₹${gmpEntry.gmp}`}
              </div>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Issue + GMP
              </div>
            </div>
          </div>

          {/* Retail Lot Profit Strip */}
          <div className="flex items-center justify-between flex-wrap gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 text-xs text-slate-700">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-brand-600 flex-shrink-0" />
              <span>
                Standard Retail Lot: <strong>1 Lot ({lotSize} Shares)</strong>
                {gmpEntry.price && (
                  <span className="text-slate-500 ml-1">
                    (~₹{(gmpEntry.price * lotSize).toLocaleString('en-IN')})
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 font-semibold text-emerald-700">
              <span>Est. Profit / Retail Lot:</span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 font-bold text-emerald-800">
                +₹{profitPerLot.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* State when GMP is 0 or not quoted yet */
        <div className="p-4 sm:p-5 flex items-start space-x-3 text-xs text-slate-600">
          <Info className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-medium text-slate-800">
              {gmpEntry && gmpEntry.gmp === 0
                ? 'Grey Market Premium is trading at par (₹0 / 0%).'
                : `Grey Market Premium (GMP) is not actively quoted yet for "${selectedIpo.name}".`}
            </p>
            <p className="text-slate-500 text-[11px]">
              Grey market premiums usually begin trading 3 to 5 days prior to IPO opening and update dynamically up to the listing day.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
