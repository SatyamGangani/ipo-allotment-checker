import React, { useState } from 'react';
import { X, Eye, EyeOff, User, CreditCard } from 'lucide-react';
import { Profile, normalizePan, validateProfileInput, validatePan } from '../types/profile';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, pan: string, editId?: string) => { success: boolean; error?: string };
  editingProfile: Profile | null;
  existingProfiles: Profile[];
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProfile,
  existingProfiles,
}) => {
  const [name, setName] = useState(editingProfile?.name || '');
  const [pan, setPan] = useState(editingProfile?.pan || '');
  const [showPan, setShowPan] = useState(false);
  const [errors, setErrors] = useState<{ nameError?: string; panError?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handlePanChange = (val: string) => {
    const uppercase = normalizePan(val);
    if (uppercase.length <= 10) {
      setPan(uppercase);
      if (errors.panError) {
        setErrors((prev) => ({ ...prev, panError: undefined }));
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateProfileInput(
      name,
      pan,
      existingProfiles,
      editingProfile?.id
    );

    if (validation.nameError || validation.panError) {
      setErrors(validation);
      return;
    }

    const result = onSave(name, pan, editingProfile?.id);
    if (!result.success) {
      setSubmitError(result.error || 'Failed to save profile');
    } else {
      onClose();
    }
  };

  const isPanFormatValid = validatePan(pan);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <User className="w-5 h-5 text-brand-600" />
            <h2 className="text-base font-semibold text-slate-900">
              {editingProfile ? 'Edit PAN Profile' : 'Add Family Member PAN'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {submitError && (
            <div className="p-3 text-xs bg-rose-50 text-rose-700 rounded-xl border border-rose-200">
              {submitError}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Profile Name / Nickname <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.nameError) setErrors((prev) => ({ ...prev, nameError: undefined }));
                }}
                placeholder="e.g. Me, Father, Brother, Spouse"
                maxLength={50}
                className={`w-full px-3.5 py-2.5 text-base sm:text-sm bg-white border rounded-xl placeholder-slate-400 focus:outline-none transition-all ${
                  errors.nameError
                    ? 'border-rose-300 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                }`}
                autoFocus
              />
            </div>
            {errors.nameError && (
              <p className="mt-1 text-xs text-rose-600">{errors.nameError}</p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700">
                PAN Number <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">10 characters (uppercase)</span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <input
                type={showPan ? 'text' : 'password'}
                value={pan}
                onChange={(e) => handlePanChange(e.target.value)}
                placeholder="ABCDE1234F"
                maxLength={10}
                className={`w-full pl-10 pr-10 py-2.5 text-base sm:text-sm font-mono tracking-wider uppercase bg-white border rounded-xl placeholder-slate-400 focus:outline-none transition-all ${
                  errors.panError
                    ? 'border-rose-300 focus:ring-1 focus:ring-rose-500'
                    : isPanFormatValid
                    ? 'border-emerald-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500'
                    : 'border-slate-200 focus:border-brand-500 focus:ring-1 focus:ring-brand-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPan(!showPan)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                title={showPan ? 'Mask PAN' : 'Show PAN'}
              >
                {showPan ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.panError ? (
              <p className="mt-1 text-xs text-rose-600">{errors.panError}</p>
            ) : (
              <p className="mt-1 text-[11px] text-slate-400">
                Standard format: 5 letters, 4 numbers, 1 letter (e.g. ABCDE1234F).
              </p>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 active:bg-brand-800 rounded-xl shadow-sm transition-colors"
            >
              {editingProfile ? 'Save Changes' : 'Add Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
