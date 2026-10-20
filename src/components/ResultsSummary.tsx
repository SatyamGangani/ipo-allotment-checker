import React from 'react';
import { AllotmentSummary } from '../types/allotment';
import { CheckCircle2, XCircle, MinusCircle, Clock, ExternalLink, AlertCircle } from 'lucide-react';

interface ResultsSummaryProps {
  summary: AllotmentSummary;
}

export const ResultsSummary: React.FC<ResultsSummaryProps> = ({ summary }) => {
  if (summary.total === 0) return null;

  const items = [
    {
      label: 'Allotted',
      count: summary.allotted,
      icon: CheckCircle2,
      cardClass: 'bg-emerald-50/70 border-emerald-200 text-emerald-800',
      iconClass: 'text-emerald-600',
    },
    {
      label: 'Not Allotted',
      count: summary.notAllotted,
      icon: XCircle,
      cardClass: 'bg-slate-50 border-slate-200 text-slate-800',
      iconClass: 'text-slate-500',
    },
    {
      label: 'Not Applied',
      count: summary.notApplied,
      icon: MinusCircle,
      cardClass: 'bg-zinc-50 border-zinc-200 text-zinc-700',
      iconClass: 'text-zinc-400',
    },
    {
      label: 'Pending',
      count: summary.pending,
      icon: Clock,
      cardClass: 'bg-blue-50/70 border-blue-200 text-blue-800',
      iconClass: 'text-blue-500',
    },
    {
      label: 'Check Manually',
      count: summary.manualCheck,
      icon: ExternalLink,
      cardClass: 'bg-amber-50/70 border-amber-200 text-amber-800',
      iconClass: 'text-amber-600',
    },
    {
      label: 'Could Not Check',
      count: summary.error,
      icon: AlertCircle,
      cardClass: 'bg-rose-50/70 border-rose-200 text-rose-800',
      iconClass: 'text-rose-600',
    },
  ];

  // Only display categories that have > 0 counts, or always show Allotted / Not Allotted
  const visibleItems = items.filter((item) => item.count > 0);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <div
            key={item.label}
            className={`flex flex-col p-3 rounded-xl border transition-all ${item.cardClass}`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium truncate mr-1">{item.label}</span>
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${item.iconClass}`} />
            </div>
            <span className="text-xl font-bold tracking-tight">
              {item.count}
            </span>
          </div>
        );
      })}
    </div>
  );
};
