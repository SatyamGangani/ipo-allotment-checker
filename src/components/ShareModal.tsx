import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Share2,
  Copy,
  Check,
  CheckSquare,
  Square,
  MessageCircle,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { ProfileAllotmentResult, inferLotSize, formatLotAndShares } from '../types/allotment';
import { maskPan } from '../types/profile';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: ProfileAllotmentResult[];
  ipoName: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  results,
  ipoName,
}) => {
  // Initialize with all profiles selected
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(results.map((r) => r.profileId))
  );
  const [copied, setCopied] = useState(false);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const allSelected = results.length > 0 && selectedIds.size === results.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(results.map((r) => r.profileId)));
    }
  };

  const toggleProfile = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const lotSize = useMemo(() => inferLotSize(results), [results]);

  // Build the live share message
  const shareMessage = useMemo(() => {
    const selectedResults = results.filter((r) => selectedIds.has(r.profileId));
    if (selectedResults.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push(`🎉 IPO Allotment: ${ipoName}`);
    lines.push('');

    let totalAllottedShares = 0;
    let allottedCount = 0;

    for (const r of selectedResults) {
      if (r.status === 'allotted') {
        const qty = r.allottedQuantity || 0;
        totalAllottedShares += qty;
        allottedCount += 1;
        lines.push(`✅ ${r.profileName}: ${formatLotAndShares(qty, lotSize)} Allotted! 🚀`);
      } else if (r.status === 'not_allotted') {
        lines.push(`❌ ${r.profileName}: Not Allotted`);
      } else if (r.status === 'not_applied') {
        lines.push(`➖ ${r.profileName}: Not Applied`);
      } else if (r.status === 'pending') {
        lines.push(`⏳ ${r.profileName}: Result Pending`);
      } else if (r.status === 'manual_check') {
        lines.push(`🔍 ${r.profileName}: Check Manually`);
      } else {
        lines.push(`⚠️ ${r.profileName}: Could Not Check`);
      }
    }

    lines.push('');
    if (totalAllottedShares > 0) {
      lines.push(
        `📊 Total: ${formatLotAndShares(totalAllottedShares, lotSize)} allotted across ${allottedCount} family member${allottedCount > 1 ? 's' : ''}`
      );
    } else {
      lines.push('📊 Total Allotted: 0 Shares');
    }
    lines.push('⚡ Checked via IPO Allotment Checker');

    return lines.join('\n');
  }, [results, selectedIds, ipoName, lotSize]);

  const handleCopy = async () => {
    if (!shareMessage) return;
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  const handleWhatsAppShare = () => {
    if (!shareMessage) return;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="share-modal-title" className="text-base font-bold text-slate-900">
                Share Allotment Results
              </h3>
              <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-sm">
                {ipoName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {/* Member Selection Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Select Members to Include
              </span>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center space-x-1"
              >
                {allSelected ? (
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>
                  {allSelected ? 'Deselect All' : 'Select All'} ({selectedIds.size}/{results.length})
                </span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 border border-slate-200/80 rounded-2xl p-2 bg-slate-50/50">
              {results.map((r) => {
                const isSelected = selectedIds.has(r.profileId);
                const isAllotted = r.status === 'allotted';

                return (
                  <button
                    key={r.profileId}
                    type="button"
                    onClick={() => toggleProfile(r.profileId)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-white border border-slate-200 shadow-xs'
                        : 'bg-transparent text-slate-400 hover:bg-slate-100/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="flex-shrink-0">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300" />
                        )}
                      </div>
                      <div className="truncate">
                        <span
                          className={`font-semibold text-xs truncate block ${
                            isSelected ? 'text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          {r.profileName}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {maskPan(r.pan)}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 ml-2">
                      {isAllotted ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{formatLotAndShares(r.allottedQuantity || 0, lotSize)}</span>
                        </span>
                      ) : r.status === 'not_allotted' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                          <XCircle className="w-3 h-3 text-slate-400" />
                          <span>Not Allotted</span>
                        </span>
                      ) : r.status === 'not_applied' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-500">
                          <MinusCircle className="w-3 h-3 text-zinc-400" />
                          <span>Not Applied</span>
                        </span>
                      ) : r.status === 'manual_check' ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700">
                          <ExternalLink className="w-3 h-3 text-amber-500" />
                          <span>Manual</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700">
                          <AlertCircle className="w-3 h-3 text-rose-500" />
                          <span>Error</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Message Preview */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Message Preview
              </span>
              <span className="text-[11px] text-slate-400">
                Ready to send to family
              </span>
            </div>

            {shareMessage ? (
              <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner select-all">
                {shareMessage}
              </div>
            ) : (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                Please select at least one family member to generate a shareable summary.
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleCopy}
            disabled={!shareMessage}
            className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium text-xs flex items-center justify-center space-x-1.5 transition-all ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Text</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleWhatsAppShare}
            disabled={!shareMessage}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-[#25D366] hover:bg-[#20ba59] active:scale-98 transition-all flex items-center justify-center space-x-2 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4 fill-white" />
            <span>Share on WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
};
