import React, { useState } from 'react';
import { ShieldCheck, Info, Sparkles, X } from 'lucide-react';

export const Header: React.FC = () => {
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  return (
    <>
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-sky-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">IPO Check</h1>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200">
                  Minimal Multi-PAN
                </span>
              </div>
              <p className="text-xs text-slate-500 flex items-center space-x-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Your profiles are saved locally on this device.</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowPrivacyModal(true)}
            className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            title="Learn about local storage & privacy"
          >
            <Info className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Privacy Info</span>
          </button>
        </div>
      </header>

      {/* Privacy modal dialog */}
      {showPrivacyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h2 className="text-base font-semibold text-slate-900">Privacy & Local Storage</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
              <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-900 text-xs">
                <strong>Zero Server Persistence:</strong> Your family PAN numbers are never stored in any cloud database or backend server.
              </div>
              <p>
                All names and PAN numbers are saved solely inside your web browser using <code>localStorage</code>. They stay exclusively on this computer / phone.
              </p>
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs">
                <strong>Important Note:</strong> Browser <code>localStorage</code> is device-local storage, not hardware-encrypted storage. Anyone with access to this browser profile can inspect saved data.
              </div>
              <p className="text-xs text-slate-500">
                When you initiate an allotment check, only the specific PAN needed for that inquiry is transmitted in-memory to the registrar adapter to retrieve the status. PAN values are never logged or sent to analytics.
              </p>
            </div>
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowPrivacyModal(false)}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
