import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, Zap, ExternalLink, RefreshCw } from 'lucide-react';
import { IpoItem, REGISTRAR_META } from '../types/ipo';

interface IpoSelectorProps {
  ipos: IpoItem[];
  selectedIpo: IpoItem | null;
  onSelect: (ipo: IpoItem) => void;
  isLoading: boolean;
  onRefresh: () => void;
}

export const IpoSelector: React.FC<IpoSelectorProps> = ({
  ipos,
  selectedIpo,
  onSelect,
  isLoading,
  onRefresh,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredIpos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return ipos;
    return ipos.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.symbol.toLowerCase().includes(q) ||
        item.registrarName.toLowerCase().includes(q)
    );
  }, [ipos, searchQuery]);

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
        Select IPO / Issue
      </label>

      {/* Main Trigger Button */}
      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex-1 flex items-center justify-between px-4 py-3 bg-white rounded-xl border text-left transition-all shadow-sm ${
            isOpen
              ? 'border-brand-500 ring-2 ring-brand-500/10'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {selectedIpo ? (
            <div className="flex items-center justify-between w-full min-w-0 pr-1 sm:pr-2">
              <div className="min-w-0 flex-1 mr-2">
                <div className="flex items-center space-x-1.5 min-w-0">
                  <span className="font-semibold text-slate-900 text-xs sm:text-sm truncate">
                    {selectedIpo.name}
                  </span>
                  {selectedIpo.issueType && (
                    <span className="text-[9px] sm:text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 flex-shrink-0">
                      {selectedIpo.issueType}
                    </span>
                  )}
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
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 transition-colors shadow-sm disabled:opacity-50"
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
                placeholder="Search IPO name, symbol, or registrar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-base sm:text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredIpos.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No matching IPOs found. Try a different search term.
              </div>
            ) : (
              filteredIpos.map((ipo) => {
                const isSelected = selectedIpo?.id === ipo.id;
                const meta = REGISTRAR_META[ipo.registrar] || REGISTRAR_META.OTHER;

                return (
                  <button
                    key={ipo.id}
                    type="button"
                    onClick={() => {
                      onSelect(ipo);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    className={`w-full p-3.5 text-left flex items-start justify-between transition-colors ${
                      isSelected ? 'bg-brand-50/60' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="pr-3 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-slate-900 text-xs sm:text-sm truncate">
                          {ipo.name}
                        </span>
                        {ipo.issueType && (
                          <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {ipo.issueType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
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
                      {isSelected && <Check className="w-4 h-4 text-brand-600" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
