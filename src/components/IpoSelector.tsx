import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, CheckCircle2, Zap, ExternalLink, RefreshCw, Flame, History } from 'lucide-react';
import { IpoItem, REGISTRAR_META } from '../types/ipo';
import { GmpEntry, findGmpForIpo } from '../services/gmpService';

interface IpoSelectorProps {
  ipos: IpoItem[];
  selectedIpo: IpoItem | null;
  onSelect: (ipo: IpoItem) => void;
  isLoading: boolean;
  onRefresh: () => void;
  gmpList?: GmpEntry[];
}

export const IpoSelector: React.FC<IpoSelectorProps> = ({
  ipos,
  selectedIpo,
  onSelect,
  isLoading,
  onRefresh,
  gmpList = [],
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'latest' | 'past'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Counts
  const latestCount = useMemo(() => ipos.filter((i) => i.timePeriod === 'latest').length, [ipos]);
  const pastCount = useMemo(() => ipos.filter((i) => i.timePeriod === 'past').length, [ipos]);

  // GMP for the currently selected IPO
  const selectedGmp = useMemo(() => {
    return findGmpForIpo(selectedIpo?.name, gmpList);
  }, [selectedIpo, gmpList]);

  // Filtered list
  const filteredIpos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = ipos;

    if (activeTab === 'latest') {
      list = list.filter((item) => item.timePeriod === 'latest');
    } else if (activeTab === 'past') {
      list = list.filter((item) => item.timePeriod === 'past');
    }

    if (!q) return list;
    return list.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q) ||
        item.registrarName.toLowerCase().includes(q)
    );
  }, [ipos, searchQuery, activeTab]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Select IPO / Issue
        </label>
        <span className="text-[11px] text-slate-400">
          {latestCount} Latest • {pastCount} Past Issues
        </span>
      </div>

      {/* Main Trigger Button */}
      {/* Main Trigger Button & Refresher */}
      <div className="flex items-center gap-2 w-full">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 min-w-0 flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-white rounded-xl border text-left transition-all shadow-sm ${
            isOpen
              ? 'border-brand-500 ring-2 ring-brand-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {selectedIpo ? (
            <div className="flex items-center justify-between w-full min-w-0 pr-1 sm:pr-2">
              <div className="min-w-0 flex-1 mr-2">
                <div className="flex items-center space-x-1.5 min-w-0 flex-wrap gap-y-1">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                    {selectedIpo.name}
                  </span>
                  {selectedIpo.timePeriod === 'latest' ? (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                      Latest
                    </span>
                  ) : (
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200 flex-shrink-0">
                      Past
                    </span>
                  )}
                  {selectedIpo.issueType && (
                    <span className="hidden xs:inline-flex text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                      {selectedIpo.issueType}
                    </span>
                  )}
                  {selectedGmp?.isListed ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-blue-50 text-blue-800 border border-blue-300 shadow-xs flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                      <span>
                        Listed: ₹{selectedGmp.listingPrice}{' '}
                        ({selectedGmp.listingGainPct !== undefined && selectedGmp.listingGainPct > 0 ? '+' : ''}
                        {selectedGmp.listingGainPct?.toFixed(1) ?? '0.0'}%)
                      </span>
                    </span>
                  ) : selectedGmp && selectedGmp.gmp > 0 ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-extrabold bg-amber-50 text-amber-800 border border-amber-300 shadow-xs flex-shrink-0">
                      <Flame className="w-3 h-3 text-amber-600 fill-amber-500" />
                      <span>GMP: +{selectedGmp.pct.toFixed(1)}% (₹{selectedGmp.gmp})</span>
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center flex-wrap gap-x-1.5 gap-y-0.5 mt-0.5 text-[11px] sm:text-xs text-slate-500">
                  <span>Registrar: <strong className="text-slate-700">{selectedIpo.registrarName}</strong></span>
                  <span>•</span>
                  {selectedIpo.supportType === 'automated' ? (
                    <span className="inline-flex items-center text-emerald-600 font-medium">
                      <Zap className="w-3 h-3 mr-0.5 fill-emerald-600" /> Automated Check
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-amber-700 font-medium">
                      <ExternalLink className="w-3 h-3 mr-0.5" /> Manual Portal
                    </span>
                  )}
                </div>
              </div>
              <span
                className={`hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md border flex-shrink-0 ${
                  REGISTRAR_META[selectedIpo.registrar]?.badgeColor || 'bg-slate-100 text-slate-700'
                }`}
              >
                {selectedIpo.registrarName}
              </span>
            </div>
          ) : (
            <span className="text-sm text-slate-400 font-normal">Choose an IPO to check allotment...</span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${
              isOpen ? 'rotate-180 text-brand-600' : ''
            }`}
          />
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          aria-label="Refresh live IPO list"
          className="self-stretch flex-shrink-0 w-11 sm:w-12 flex items-center justify-center bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 transition-colors shadow-sm disabled:opacity-50"
          title="Refresh live IPO list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl border border-slate-200/90 z-40 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Search Bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search across all latest & past IPOs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          {/* Quick Filter Tabs: All, Latest, Past */}
          <div className="flex items-center space-x-1.5 px-3 py-2 bg-slate-50/90 border-b border-slate-100 text-xs overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all flex-shrink-0 ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              All ({ipos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('latest')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all flex-shrink-0 ${
                activeTab === 'latest'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-semibold'
                  : 'text-slate-500 hover:text-emerald-700'
              }`}
            >
              <Flame className="w-3 h-3 text-emerald-600 fill-emerald-500" />
              <span>Latest / Active ({latestCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-md font-medium transition-all flex-shrink-0 ${
                activeTab === 'past'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200 font-semibold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3 h-3 text-slate-400" />
              <span>Past IPOs ({pastCount})</span>
            </button>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filteredIpos.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No matching IPOs found. Try searching by company name, symbol, or registrar.
              </div>
            ) : (
              filteredIpos.map((ipo, idx) => {
                const isSelected = selectedIpo?.id === ipo.id;
                const meta = REGISTRAR_META[ipo.registrar] || REGISTRAR_META.OTHER;
                const isFirstPast =
                  activeTab === 'all' &&
                  !searchQuery &&
                  ipo.timePeriod === 'past' &&
                  (idx === 0 || filteredIpos[idx - 1]?.timePeriod === 'latest');
                const isFirstLatest =
                  activeTab === 'all' &&
                  !searchQuery &&
                  ipo.timePeriod === 'latest' &&
                  idx === 0;

                const itemGmp = findGmpForIpo(ipo.name, gmpList);

                return (
                  <React.Fragment key={ipo.id}>
                    {/* Category Divider in 'all' view */}
                    {isFirstLatest && (
                      <div className="bg-emerald-50/60 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800 flex items-center justify-between border-b border-emerald-100">
                        <span className="flex items-center space-x-1">
                          <Flame className="w-3 h-3 text-emerald-600 fill-emerald-500" />
                          <span>Latest & Active Issues ({latestCount})</span>
                        </span>
                        <span className="text-emerald-600 font-normal lowercase">always on top</span>
                      </div>
                    )}
                    {isFirstPast && (
                      <div className="bg-slate-100/80 px-3.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between border-t border-b border-slate-200">
                        <span className="flex items-center space-x-1">
                          <History className="w-3 h-3 text-slate-500" />
                          <span>Past & Recently Closed Issues ({pastCount})</span>
                        </span>
                        <span className="text-slate-500 font-normal lowercase">historical</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        onSelect(ipo);
                        setIsOpen(false);
                        setSearchQuery('');
                      }}
                      className={`w-full p-3 sm:p-3.5 text-left flex items-start justify-between transition-colors ${
                        isSelected ? 'bg-brand-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="pr-3 min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                            {ipo.name}
                          </span>
                          {ipo.timePeriod === 'latest' ? (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 flex-shrink-0">
                              Latest
                            </span>
                          ) : (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200 flex-shrink-0">
                              Past
                            </span>
                          )}
                          {ipo.issueType && (
                            <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                              {ipo.issueType}
                            </span>
                          )}
                          {itemGmp?.isListed ? (
                            <span className="inline-flex items-center space-x-0.5 text-[9px] sm:text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-300 px-1.5 py-0.2 rounded flex-shrink-0">
                              <span>
                                Listed ₹{itemGmp.listingPrice} ({itemGmp.listingGainPct !== undefined && itemGmp.listingGainPct > 0 ? '+' : ''}
                                {itemGmp.listingGainPct?.toFixed(1) ?? '0.0'}%)
                              </span>
                            </span>
                          ) : itemGmp && itemGmp.gmp > 0 ? (
                            <span className="inline-flex items-center space-x-0.5 text-[9px] sm:text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.2 rounded flex-shrink-0">
                              <Flame className="w-2.5 h-2.5 text-amber-600 fill-amber-500" />
                              <span>+{itemGmp.pct.toFixed(1)}% (₹{itemGmp.gmp})</span>
                            </span>
                          ) : null}
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[11px] text-slate-500">
                          <span>Registrar: <strong>{ipo.registrarName}</strong></span>
                          <span>•</span>
                          {ipo.supportType === 'automated' ? (
                            <span className="text-emerald-700 font-semibold inline-flex items-center">
                              <Zap className="w-3 h-3 mr-0.5 fill-emerald-600 text-emerald-600" /> Direct 1-Click Allotment
                            </span>
                          ) : (
                            <span className="text-amber-700 font-medium inline-flex items-center">
                              <ExternalLink className="w-3 h-3 mr-0.5 text-amber-600" /> {ipo.supportReason}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${meta.badgeColor}`}>
                          {ipo.registrarName}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
