import React, { useState } from 'react';
import { ProfileAllotmentResult, computeSummary } from '../types/allotment';
import { IpoItem } from '../types/ipo';
import { ResultsSummary } from './ResultsSummary';
import { ResultCard } from './ResultCard';
import { ListingGainCalculator } from './ListingGainCalculator';
import { ShareModal } from './ShareModal';
import { BarChart3, Share2 } from 'lucide-react';

interface ResultsSectionProps {
  results: ProfileAllotmentResult[];
  onRetry: (profileId: string) => void;
  retryingId: string | null;
  selectedIpo?: IpoItem | null;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  results,
  onRetry,
  retryingId,
  selectedIpo,
}) => {
  const [isShareOpen, setIsShareOpen] = useState(false);

  if (results.length === 0) return null;

  const summary = computeSummary(results);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Section Header with Share Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BarChart3 className="w-4 h-4 text-slate-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
            Allotment Results ({results.length})
          </h3>
        </div>

        <button
          type="button"
          onClick={() => setIsShareOpen(true)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/90 hover:bg-emerald-100 hover:border-emerald-300 active:scale-98 transition-all shadow-xs"
          title="Share results via WhatsApp or copy summary"
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Share Results</span>
        </button>
      </div>

      {/* Summary Cards */}
      <ResultsSummary summary={summary} />

      {/* Listing Gain / Profit Calculator (Shown when allotment exists) */}
      <ListingGainCalculator results={results} ipoName={selectedIpo?.name} />

      {/* Profile Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {results.map((res) => (
          <ResultCard
            key={res.profileId}
            result={res}
            onRetry={onRetry}
            isRetrying={retryingId === res.profileId}
          />
        ))}
      </div>

      {/* Selective Share Modal */}
      {isShareOpen && (
        <ShareModal
          key="share-modal"
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          results={results}
          ipoName={selectedIpo?.name || 'IPO Allotment'}
        />
      )}
    </div>
  );
};

