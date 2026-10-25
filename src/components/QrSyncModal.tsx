import React, { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  X,
  QrCode,
  Camera,
  Upload,
  CheckSquare,
  Square,
  Check,
  Copy,
  AlertCircle,
  Users,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Profile, maskPan, validatePan, normalizePan } from '../types/profile';
import { StorageService } from '../services/storage';

interface QrSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  profiles: Profile[];
  onImportSuccess: (importedCount: number) => void;
}

export const QrSyncModal: React.FC<QrSyncModalProps> = ({
  isOpen,
  onClose,
  profiles,
  onImportSuccess,
}) => {
  // Tabs: 'share' (export via QR) | 'scan' (import via camera/upload)
  const [activeTab, setActiveTab] = useState<'share' | 'scan'>('share');

  // Share tab states
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(profiles.map((p) => p.id))
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedData, setCopiedData] = useState(false);

  // Scan tab states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [parsedIncoming, setParsedIncoming] = useState<
    Array<{ name: string; pan: string }>
  >([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const selectedProfiles = profiles
    .filter((p) => selectedIds.has(p.id))
    .map((p) => ({ name: p.name, pan: p.pan }));

  // Generate QR Code when selected profiles change
  useEffect(() => {
    if (!isOpen || activeTab !== 'share' || selectedProfiles.length === 0) return;

    const payload = JSON.stringify({
      app: 'ipo-check',
      v: 1,
      profiles: selectedProfiles,
    });

    let isMounted = true;
    QRCode.toDataURL(payload, {
      margin: 1,
      width: 280,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        if (isMounted) setQrDataUrl(url);
      })
      .catch((err) => console.error('Failed to generate QR code:', err));

    return () => {
      isMounted = false;
    };
  }, [isOpen, activeTab, selectedProfiles]);

  // --- Camera Scanning logic ---
  const stopCameraStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    stopCameraStream();
    setCameraActive(false);
  }, [stopCameraStream]);

  const processQrText = useCallback(
    (text: string) => {
      try {
        let raw: any;
        try {
          raw = JSON.parse(text);
        } catch {
          return false;
        }

        let list: any[] = [];
        if (raw && Array.isArray(raw.profiles)) {
          list = raw.profiles;
        } else if (Array.isArray(raw)) {
          list = raw;
        }

        const valid = list
          .map((item) => ({
            name: typeof item.name === 'string' ? item.name.trim() : '',
            pan: typeof item.pan === 'string' ? normalizePan(item.pan) : '',
          }))
          .filter((item) => item.name && validatePan(item.pan));

        if (valid.length > 0) {
          stopCamera();
          setParsedIncoming(valid);
          setCameraError(null);
          return true;
        }
      } catch (e) {
        console.warn('QR parse failed:', e);
      }
      return false;
    },
    [stopCamera]
  );

  const tickScanRef = useRef<() => void>(() => {});

  const tickScan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data) {
          const success = processQrText(code.data);
          if (success) return; // Stop scanning once found
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(() => tickScanRef.current());
  }, [processQrText]);

  useEffect(() => {
    tickScanRef.current = tickScan;
  }, [tickScan]);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setParsedIncoming([]);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported by your browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        animationFrameRef.current = requestAnimationFrame(() => tickScanRef.current());
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        err.message || 'Unable to access camera. Please allow camera permissions or upload an image.'
      );
      setCameraActive(false);
    }
  }, [stopCamera]);

  // Clean up camera on tab change or close
  useEffect(() => {
    let active = true;
    if (activeTab === 'scan') {
      const initCamera = async () => {
        if (active) await startCamera();
      };
      void initCamera();
    } else {
      stopCameraStream();
    }
    return () => {
      active = false;
      stopCameraStream();
    };
  }, [activeTab, startCamera, stopCameraStream]);

  const allSelected = profiles.length > 0 && selectedIds.size === profiles.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(profiles.map((p) => p.id)));
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

  const handleCopyPayload = async () => {
    const selectedProfiles = profiles
      .filter((p) => selectedIds.has(p.id))
      .map((p) => ({ name: p.name, pan: p.pan }));
    if (selectedProfiles.length === 0) return;

    const payload = JSON.stringify({
      app: 'ipo-check',
      v: 1,
      profiles: selectedProfiles,
    });

    try {
      await navigator.clipboard.writeText(payload);
      setCopiedData(true);
      setTimeout(() => setCopiedData(false), 2000);
    } catch {}
  };

  // File Upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code && code.data) {
          const success = processQrText(code.data);
          if (!success) {
            setCameraError('Found QR code, but it did not contain valid IPO profiles.');
          }
        } else {
          setCameraError('No QR code detected in this image. Please try another photo.');
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Perform the import into StorageService
  const handleConfirmImport = () => {
    if (parsedIncoming.length === 0) return;

    const { added, skippedCount } = StorageService.importProfiles(parsedIncoming);
    if (added.length > 0) {
      onImportSuccess(added.length);
      setImportStatus(
        `Successfully imported ${added.length} profile${added.length > 1 ? 's' : ''}!${
          skippedCount > 0 ? ` (${skippedCount} already existed)` : ''
        }`
      );
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      setImportStatus(`All ${skippedCount} profile(s) already exist on this device.`);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-sync-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 id="qr-sync-modal-title" className="text-base font-bold text-slate-900">
                QR Profile Sync
              </h3>
              <p className="text-xs text-slate-500">
                Zero server transfer • Device-to-device instant sync
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/40 p-2 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'share'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/90'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Share via QR (Export)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scan')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === 'scan'
                ? 'bg-white text-emerald-800 shadow-xs border border-slate-200/90'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/70'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan QR (Import)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-sm">
          {activeTab === 'share' ? (
            /* TAB 1: SHARE VIA QR */
            <div className="space-y-4">
              {profiles.length === 0 ? (
                <div className="text-center py-8 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                  <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No saved profiles to share</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Add family member PANs first to generate a sharing QR code.
                  </p>
                </div>
              ) : (
                <>
                  {/* Member Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Choose Profiles to Share
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
                          {allSelected ? 'Deselect All' : 'Select All'} ({selectedIds.size}/{profiles.length})
                        </span>
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto border border-slate-200/80 rounded-2xl p-2 bg-slate-50/50">
                      {profiles.map((p) => {
                        const isSelected = selectedIds.has(p.id);
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => toggleProfile(p.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all ${
                              isSelected
                                ? 'bg-white border border-slate-200 shadow-2xs'
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
                              <span
                                className={`font-semibold text-xs truncate ${
                                  isSelected ? 'text-slate-900' : 'text-slate-500'
                                }`}
                              >
                                {p.name}
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-slate-400 flex-shrink-0">
                              {maskPan(p.pan)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* QR Code Presentation */}
                  {qrDataUrl ? (
                    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200/90 text-center">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200 mb-2.5">
                        <img
                          src={qrDataUrl}
                          alt="Profiles QR Code"
                          className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                        />
                      </div>
                      <p className="text-xs font-semibold text-slate-800">
                        Scan from another device to import
                      </p>
                      <p className="text-[11px] text-slate-500 max-w-xs mt-0.5">
                        Opens directly in this app or phone camera. No servers, completely private.
                      </p>

                      <button
                        type="button"
                        onClick={handleCopyPayload}
                        className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-medium text-slate-700 transition-colors"
                      >
                        {copiedData ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Copied Sync Data!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Raw Sync Data</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      Select at least 1 profile above to generate a QR code.
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* TAB 2: SCAN QR TO IMPORT */
            <div className="space-y-4">
              {importStatus ? (
                <div className="p-5 text-center bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800">
                  <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm font-bold">{importStatus}</p>
                </div>
              ) : parsedIncoming.length > 0 ? (
                /* Confirmation Screen for Scanned Profiles */
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Found {parsedIncoming.length} Profiles in QR Code:</span>
                  </div>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-200 rounded-2xl p-2.5 bg-slate-50">
                    {parsedIncoming.map((item, idx) => {
                      const alreadyExists = profiles.some(
                        (p) => p.pan.toUpperCase() === item.pan.toUpperCase()
                      );
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-100 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 block">
                              {item.name}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {maskPan(item.pan)}
                            </span>
                          </div>
                          {alreadyExists ? (
                            <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                              Already exists
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              New Profile
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setParsedIncoming([]);
                        startCamera();
                      }}
                      className="flex-1 py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Rescan
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      className="flex-1 py-2.5 px-3 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm"
                    >
                      Import Profiles Now
                    </button>
                  </div>
                </div>
              ) : (
                /* Scanner Viewfinder & Controls */
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center border border-slate-800">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {cameraActive && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-48 h-48 sm:w-56 sm:h-56 border-2 border-emerald-400 border-dashed rounded-2xl animate-pulse" />
                      </div>
                    )}

                    {!cameraActive && !cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-white/80 bg-slate-950/80">
                        <Camera className="w-8 h-8 text-emerald-400 mb-2 animate-bounce" />
                        <p className="text-xs font-semibold">Starting camera scanner...</p>
                      </div>
                    )}

                    {cameraError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-slate-200 bg-slate-950/90">
                        <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                        <p className="text-xs text-amber-200 font-semibold mb-1">
                          Camera Scan Unavailable
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-xs mb-3">
                          {cameraError}
                        </p>
                        <button
                          type="button"
                          onClick={startCamera}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-white flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Retry Camera</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Fallback upload button */}
                  <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 bg-slate-50/70">
                    <div className="text-xs">
                      <p className="font-semibold text-slate-800">Or upload a QR code image</p>
                      <p className="text-[11px] text-slate-500">From a screenshot or saved photo</p>
                    </div>
                    <label className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors shadow-2xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
