import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Percent,
  IndianRupee,
} from 'lucide-react';
import {
  ProfileAllotmentResult,
  inferLotSize,
  formatLotAndShares,
} from '../types/allotment';
import { fetchGmpList, findGmpForIpo } from '../services/gmpService';

interface ListingGainCalculatorProps {
  results: ProfileAllotmentResult[];
  ipoName?: string;
}

export const ListingGainCalculator: React.FC<ListingGainCalculatorProps> = ({
  results,
  ipoName,
}) => {
  // Filter allotted members
  const allottedResults = results.filter(
    (r) => r.status === 'allotted' && (r.allottedQuantity || 0) > 0
  );

  const totalAllottedShares = allottedResults.reduce(
    (sum, r) => sum + (r.allottedQuantity || 0),
    0
  );

  const lotSize = useMemo(() => inferLotSize(results), [results]);

  // Mode: 'percent' (default & priority) or 'amount'
  const [mode, setMode] = useState<'percent' | 'amount'>('percent');

  // Percentage mode states (default 35%)
  const [percentGain, setPercentGain] = useState<number>(35);
  const lotInvestment = 15000; // Standard Indian retail lot investment ~₹15,000

  // Amount mode states (default ₹50 per share)
  const [gainPerShare, setGainPerShare] = useState<number>(50);

  const [liveGmpInfo, setLiveGmpInfo] = useState<{
    name: string;
    gmp: number;
    pct: number;
    source: string;
    isListed?: boolean;
    listingPrice?: number;
    listingGainPct?: number;
    listingGainPerShare?: number;
  } | null>(null);

  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Automatically fetch live GMP via gmpService
  useEffect(() => {
    if (!ipoName) return;

    let active = true;
    fetchGmpList()
      .then((items) => {
        if (!active) return;
        const match = findGmpForIpo(ipoName, items);
        if (match) {
          setLiveGmpInfo({
            name: match.name,
            gmp: match.gmp,
            pct: match.pct,
            source: match.source,
            isListed: match.isListed,
            listingPrice: match.listingPrice,
            listingGainPct: match.listingGainPct,
            listingGainPerShare: match.listingGainPerShare,
          });
          if (match.isListed) {
            if (match.listingGainPct !== undefined) {
              setPercentGain(match.listingGainPct);
            }
            if (match.listingGainPerShare !== undefined) {
              setGainPerShare(match.listingGainPerShare);
            }
          } else {
            if (match.pct > 0) {
              setPercentGain(match.pct);
            }
            if (match.gmp > 0) {
              setGainPerShare(match.gmp);
            }
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [ipoName]);

  if (totalAllottedShares === 0) {
    return null;
  }

  // Calculate lots count (minimum 1 lot per allotted person or total shares / lotSize)
  const effectiveLotSize = lotSize > 0 ? lotSize : totalAllottedShares;
  const totalLots = Math.max(1, Math.round(totalAllottedShares / effectiveLotSize));

  const safePercent = isNaN(percentGain) || percentGain < 0 ? 0 : percentGain;
  const safeLotInvestment = isNaN(lotInvestment) || lotInvestment < 0 ? 15000 : lotInvestment;
  const safeGainPerShare = isNaN(gainPerShare) || gainPerShare < 0 ? 0 : gainPerShare;

  // Calculate profit based on mode
  const estimatedTotalProfit =
    mode === 'percent'
      ? Math.round(totalLots * safeLotInvestment * (safePercent / 100))
      : Math.round(totalAllottedShares * safeGainPerShare);

  const percentPresets = [15, 30, 50, 75, 100];
  const amountPresets = [25, 50, 100, 150, 250];

  const formatRupee = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50 to-teal-50/60 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 shadow-sm transition-all">
      {/* Header Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm shadow-emerald-600/30">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="text-sm font-bold text-slate-900">
                Listing Gain & Profit Estimator
              </h3>
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
            </div>
            <p className="text-xs text-slate-600">
              Total {formatLotAndShares(totalAllottedShares, lotSize)} allotted across{' '}
              {allottedResults.length} family member{allottedResults.length > 1 ? 's' : ''}
              {ipoName ? ` for ${ipoName}` : ''}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100/60 transition-colors"
        >
          <span>{isExpanded ? 'Hide' : 'Calculate'}</span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Expandable Calculator Body */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-emerald-200/70 space-y-4">
          {/* Mode Selector Pill (Priority: Percentage first!) */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center space-x-1 bg-white/90 p-1 rounded-xl border border-emerald-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setMode('percent')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'percent'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Percent className="w-3.5 h-3.5" />
                <span>Percentage (%) Mode</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('amount')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  mode === 'amount'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <IndianRupee className="w-3.5 h-3.5" />
                <span>₹ Amount Mode</span>
              </button>
            </div>

            <div className="flex items-center space-x-2 flex-wrap gap-1">
              {liveGmpInfo?.isListed ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <span>
                    Listed at ₹{liveGmpInfo.listingPrice} ({liveGmpInfo.listingGainPct !== undefined && liveGmpInfo.listingGainPct > 0 ? '+' : ''}
                    {liveGmpInfo.listingGainPct?.toFixed(1) ?? '0.0'}%) via {liveGmpInfo.source}
                  </span>
                </span>
              ) : liveGmpInfo ? (
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  <span>
                    Live GMP: +{liveGmpInfo.pct}% (+₹{liveGmpInfo.gmp}/sh) via {liveGmpInfo.source}
                  </span>
                </span>
              ) : null}
              {mode === 'percent' && (
                <span className="text-[11px] text-emerald-800 font-medium bg-emerald-100/60 px-2 py-0.5 rounded-md">
                  Standard Retail Lot ~{formatRupee(safeLotInvestment)}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            {/* Input Controls */}
            {mode === 'percent' ? (
              /* Percentage Mode (Priority) */
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="expected-percent-input"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {liveGmpInfo?.isListed
                      ? 'Official Listing Gain (%):'
                      : 'Expected Listing Gain / Target GMP (%):'}
                  </label>
                  {liveGmpInfo && (
                    <span className="text-[10px] text-emerald-700 font-medium">
                      Auto-filled from {liveGmpInfo.source}
                    </span>
                  )}
                </div>

                <div className="relative rounded-xl shadow-2xs">
                  <input
                    id="expected-percent-input"
                    type="number"
                    min="0"
                    step="5"
                    value={percentGain === 0 ? '' : percentGain}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      setPercentGain(isNaN(parsed) ? 0 : parsed);
                    }}
                    placeholder="e.g. 35"
                    className="block w-full pl-3.5 pr-20 py-2.5 bg-white border border-emerald-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-10 flex items-center pointer-events-none text-slate-500 font-bold text-sm">
                    %
                  </div>
                  <button
                    type="button"
                    onClick={() => setPercentGain(35)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
                    title="Reset to 35%"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Preset Percentage Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 mr-1">Quick Presets:</span>
                  {percentPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPercentGain(preset)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
                        percentGain === preset
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                      }`}
                    >
                      +{preset}%
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Amount Mode (₹ per share) */
              <div className="space-y-2">
                <label
                  htmlFor="expected-gain-input"
                  className="block text-xs font-semibold text-slate-700"
                >
                  {liveGmpInfo?.isListed
                    ? 'Official Listing Gain (₹ per share):'
                    : 'Expected Listing Gain / Target GMP (₹ per share):'}
                </label>

                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 font-semibold text-sm">
                    ₹
                  </div>
                  <input
                    id="expected-gain-input"
                    type="number"
                    min="0"
                    step="5"
                    value={gainPerShare === 0 ? '' : gainPerShare}
                    onChange={(e) => {
                      const parsed = parseFloat(e.target.value);
                      setGainPerShare(isNaN(parsed) ? 0 : parsed);
                    }}
                    placeholder="e.g. 50"
                    className="block w-full pl-8 pr-16 py-2.5 bg-white border border-emerald-300 rounded-xl text-slate-900 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setGainPerShare(50)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600"
                    title="Reset to ₹50"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    <span>Reset</span>
                  </button>
                </div>

                {/* Preset Gain Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 mr-1">Quick Presets:</span>
                  {amountPresets.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setGainPerShare(preset)}
                      className={`px-2 py-0.5 rounded-lg text-xs font-medium transition-all ${
                        gainPerShare === preset
                          ? 'bg-emerald-600 text-white shadow-xs font-semibold'
                          : 'bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100/70'
                      }`}
                    >
                      +₹{preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Estimated Total Card */}
            <div className="bg-white/90 border border-emerald-300/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-center items-center text-center">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 mb-0.5">
                Estimated Family Profit
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">
                {formatRupee(estimatedTotalProfit)}
              </span>
              <span className="text-[11px] text-slate-500 mt-1">
                {mode === 'percent'
                  ? `${totalLots} Lot${totalLots > 1 ? 's' : ''} (${totalAllottedShares} shares) @ +${safePercent}% listing gain`
                  : `${totalAllottedShares} shares × ₹${safeGainPerShare} gain/share`}
              </span>
            </div>
          </div>

          {/* Member Breakdown (If multiple members allotted) */}
          {allottedResults.length > 1 && (
            <div className="pt-2 border-t border-emerald-200/50">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block mb-1.5">
                Family Member Breakdown:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allottedResults.map((r) => {
                  const shares = r.allottedQuantity || 0;
                  const memberLots = Math.max(1, Math.round(shares / effectiveLotSize));
                  const memberProfit =
                    mode === 'percent'
                      ? Math.round(memberLots * safeLotInvestment * (safePercent / 100))
                      : Math.round(shares * safeGainPerShare);

                  return (
                    <div
                      key={r.profileId}
                      className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-emerald-100 text-xs"
                    >
                      <span className="font-semibold text-slate-800 truncate mr-2">
                        {r.profileName}
                      </span>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono text-slate-500 mr-2">
                          {formatLotAndShares(shares, lotSize)}
                        </span>
                        <strong className="font-mono text-emerald-700">
                          {formatRupee(memberProfit)}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
