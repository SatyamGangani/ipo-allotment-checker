import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Users, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Profile, maskPan } from '../types/profile';

interface ProfileManagerProps {
  profiles: Profile[];
  onAddClick: () => void;
  onEditClick: (profile: Profile) => void;
  onDeleteClick: (id: string) => void;
  onDeleteAllClick: () => void;
  disabled?: boolean;
}

export const ProfileManager: React.FC<ProfileManagerProps> = ({
  profiles,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onDeleteAllClick,
  disabled = false,
}) => {
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center space-x-1.5 min-w-0">
          <Users className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700 whitespace-nowrap">
            Saved PAN Profiles
          </h2>
          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-full flex-shrink-0">
            {profiles.length}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 flex-shrink-0">
          {profiles.length > 0 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => setShowConfirmDeleteAll(true)}
              className="text-[11px] text-slate-500 hover:text-rose-600 px-2 py-1 rounded hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              Clear All
            </button>
          )}

          <button
            type="button"
            disabled={disabled}
            onClick={onAddClick}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100/70 border border-brand-200 px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add PAN</span>
          </button>
        </div>
      </div>

      {/* Profiles List */}
      {profiles.length === 0 ? (
        <div className="text-center py-7 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
          <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">No PAN profiles saved yet</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Add family member PANs once. They remain saved locally in your browser so you can check allotment in 1-click.
          </p>
          <button
            type="button"
            onClick={onAddClick}
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 px-4 py-2 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add First Family Member PAN</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 hover:bg-slate-50 border border-slate-200/80 rounded-xl transition-all group"
            >
              <div className="min-w-0 pr-2">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {profile.name}
                </p>
                <p className="text-[11px] font-mono tracking-wider text-slate-500">
                  {maskPan(profile.pan)}
                </p>
              </div>

              <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onEditClick(profile)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors disabled:opacity-50"
                  title="Edit profile"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onDeleteClick(profile.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-colors disabled:opacity-50"
                  title="Delete profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Dialog: Delete All */}
      {showConfirmDeleteAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center space-x-3 mb-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-slate-900">Delete all profiles?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-5">
              This will remove all {profiles.length} saved PAN profiles from this browser&apos;s local storage. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteAllClick();
                  setShowConfirmDeleteAll(false);
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-colors"
              >
                Yes, Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
