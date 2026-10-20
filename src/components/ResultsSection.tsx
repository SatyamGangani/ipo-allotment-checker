import React from 'react';
import { ProfileAllotmentResult, computeSummary } from '../types/allotment';
import { ResultsSummary } from './ResultsSummary';
import { ResultCard } from './ResultCard';
import { BarChart3 } from 'lucide-react';

interface ResultsSectionProps {
  results: ProfileAllotmentResult[];
  onRetry: (profileId: string) => void;
  retryingId: string | null;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  results,
  onRetry,
  retryingId,
}) => {
  if (results.length === 0) return null;

  const summary = computeSummary(results);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center space-x-2">
        <BarChart3 className="w-4 h-4 text-slate-500" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
          Allotment Results ({results.length})
        </h3>
      </div>

      {/* Summary Cards */}
      <ResultsSummary summary={summary} />

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
    </div>
  );
};
