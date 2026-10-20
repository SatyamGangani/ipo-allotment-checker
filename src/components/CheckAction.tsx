import React from 'react';
import { Loader2, ArrowRight } from 'lucide-react';
import { IpoItem } from '../types/ipo';
import { Profile } from '../types/profile';

interface CheckActionProps {
  selectedIpo: IpoItem | null;
  profiles: Profile[];
  isChecking: boolean;
  progress: { completed: number; total: number } | null;
  onCheckAll: () => void;
}

export const CheckAction: React.FC<CheckActionProps> = ({
  selectedIpo,
  profiles,
  isChecking,
  progress,
  onCheckAll,
}) => {
  const canCheck = !!selectedIpo && profiles.length > 0 && !isChecking;

  let helperText = '';
  if (!selectedIpo && profiles.length === 0) {
    helperText = 'Select an IPO and add at least one PAN profile to begin.';
  } else if (!selectedIpo) {
    helperText = 'Please select an IPO above.';
  } else if (profiles.length === 0) {
    helperText = 'Add at least one family PAN profile above.';
  }

  const percent = progress && progress.total > 0
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">
            {isChecking
              ? `Checking Allotment (${progress?.completed || 0} of ${progress?.total || profiles.length})`
              : 'Ready to Check Allotment'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isChecking
              ? `Querying ${selectedIpo?.registrarName || 'registrar'} for saved family PANs...`
              : helperText || `Will verify status for ${profiles.length} PAN profile${profiles.length > 1 ? 's' : ''}.`}
          </p>
        </div>

        <button
          type="button"
          onClick={onCheckAll}
          disabled={!canCheck}
          className={`relative overflow-hidden inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-md ${
            canCheck
              ? 'bg-gradient-to-r from-brand-600 to-sky-600 hover:from-brand-700 hover:to-sky-700 active:scale-[0.98] text-white shadow-brand-500/25'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
          }`}
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>
                Checking {progress?.completed || 0} of {progress?.total || profiles.length}...
              </span>
            </>
          ) : (
            <>
              <span>Check All PANs</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>

      {/* Progress Bar */}
      {isChecking && progress && (
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5 font-medium">
            <span>Overall Progress</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-sky-500 transition-all duration-300 rounded-full"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
