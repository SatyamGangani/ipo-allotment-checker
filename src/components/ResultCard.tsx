import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  MinusCircle,
  Clock,
  ExternalLink,
  AlertCircle,
  RotateCw,
  Copy,
  Check,
} from 'lucide-react';
import { ProfileAllotmentResult, STATUS_UI_CONFIG, AllotmentStatus, formatLotAndShares } from '../types/allotment';
import { maskPan } from '../types/profile';

interface ResultCardProps {
  result: ProfileAllotmentResult;
  onRetry?: (profileId: string) => void;
  isRetrying?: boolean;
}

const STATUS_ICONS: Record<AllotmentStatus, React.ComponentType<{ className?: string }>> = {
  allotted: CheckCircle2,
  not_allotted: XCircle,
  not_applied: MinusCircle,
  pending: Clock,
  manual_check: ExternalLink,
  error: AlertCircle,
};

export const ResultCard: React.FC<ResultCardProps> = ({
  result,
  onRetry,
  isRetrying = false,
}) => {
  const [copied, setCopied] = useState(false);
  const config = STATUS_UI_CONFIG[result.status];
  const Icon = STATUS_ICONS[result.status] || AlertCircle;

  const handleCopyPan = () => {
    navigator.clipboard.writeText(result.pan);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between">
      <div>
        {/* Header: Name, Masked PAN, and Status Badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {result.profileName}
            </h4>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-xs font-mono text-slate-500">
                {maskPan(result.pan)}
              </span>
              <button
                type="button"
                onClick={handleCopyPan}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded transition-colors"
                title="Copy full PAN to clipboard"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <span
            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ring-1 ${config.badgeClass}`}
          >
            <Icon className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{config.label}</span>
          </span>
        </div>

        {/* Highlight for Allotted Quantity */}
        {result.status === 'allotted' && typeof result.allottedQuantity === 'number' && (
          <div className="my-2.5 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between text-xs text-emerald-900">
            <span className="font-medium">Allotted Shares:</span>
            <span className="text-base font-extrabold text-emerald-700 font-mono">
              {formatLotAndShares(result.allottedQuantity, result.appliedQuantity)}
            </span>
          </div>
        )}

        {/* Applied Quantity Info if available */}
        {result.status === 'not_allotted' && typeof result.appliedQuantity === 'number' && (
          <div className="my-1.5 text-xs text-slate-500">
            Applied: <strong className="text-slate-700 font-mono">{formatLotAndShares(result.appliedQuantity, result.appliedQuantity)}</strong> • Allotted: <strong className="text-slate-700 font-mono">0</strong>
          </div>
        )}

        {/* Message / Explanation */}
        <p className="text-xs text-slate-600 leading-relaxed mt-1">
          {result.message}
        </p>

        {result.applicantName && (
          <p className="text-[11px] text-slate-400 mt-1">
            Applicant: <span className="text-slate-600 font-medium">{result.applicantName}</span>
          </p>
        )}
      </div>

      {/* Action Footer (Retry or Manual Portal Link) */}
      <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
        {result.canRetry && onRetry ? (
          <button
            type="button"
            disabled={isRetrying}
            onClick={() => onRetry(result.profileId)}
            className="inline-flex items-center space-x-1 font-semibold text-rose-600 hover:text-rose-700 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
            <span>{isRetrying ? 'Retrying...' : 'Retry Lookup'}</span>
          </button>
        ) : (
          <span className="text-[11px] text-slate-400">
            {new Date(result.checkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}

        {result.status === 'manual_check' && result.manualUrl && (
          <a
            href={result.manualUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-1 font-medium text-brand-600 hover:text-brand-700"
          >
            <span>Open Portal</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>
    </div>
  );
};
