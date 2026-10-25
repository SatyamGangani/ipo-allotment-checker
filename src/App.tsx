import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { IpoSelector } from './components/IpoSelector';
import { GmpMarketCard } from './components/GmpMarketCard';
import { ProfileManager } from './components/ProfileManager';
import { ProfileModal } from './components/ProfileModal';
import { QrSyncModal } from './components/QrSyncModal';
import { CheckAction } from './components/CheckAction';
import { ResultsSection } from './components/ResultsSection';

import { StorageService } from './services/storage';
import { fetchIpos } from './services/ipoDiscovery';
import { fetchGmpList, findGmpForIpo, GmpEntry } from './services/gmpService';
import { AllotmentService } from './services/allotmentService';

import { Profile } from './types/profile';
import { IpoItem } from './types/ipo';
import { ProfileAllotmentResult } from './types/allotment';

export function App() {
  // Profiles state initialized directly from storage
  const [profiles, setProfiles] = useState<Profile[]>(() => StorageService.getProfiles());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  // IPO state
  const [ipos, setIpos] = useState<IpoItem[]>([]);
  const [selectedIpo, setSelectedIpo] = useState<IpoItem | null>(null);
  const [isLoadingIpos, setIsLoadingIpos] = useState(true);

  // Live GMP state
  const [gmpList, setGmpList] = useState<GmpEntry[]>([]);
  const [isLoadingGmp, setIsLoadingGmp] = useState(true);

  // Allotment checking state
  const [isChecking, setIsChecking] = useState(false);
  const [progress, setProgress] = useState<{ completed: number; total: number } | null>(null);
  const [results, setResults] = useState<ProfileAllotmentResult[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Mobile scroll tracking ref
  const resultsRef = useRef<HTMLElement>(null);
  const hasScrolledToResults = useRef(false);

  // Load live GMP
  const loadGmp = useCallback(async (force = false) => {
    setIsLoadingGmp(true);
    try {
      const list = await fetchGmpList(force);
      setGmpList(list);
    } catch (err) {
      console.error('Failed to load live GMP:', err);
    } finally {
      setIsLoadingGmp(false);
    }
  }, []);

  // Load IPOs
  const loadIpos = useCallback(async (force = false) => {
    setIsLoadingIpos(true);
    try {
      const list = await fetchIpos(force);
      setIpos(list);
      setSelectedIpo((curr) => {
        if (!curr && list.length > 0) {
          return list.find((i) => i.supportType === 'automated') || list[0];
        }
        return curr;
      });
    } catch (err) {
      console.error('Failed to load IPOs:', err);
    } finally {
      setIsLoadingIpos(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchIpos().then((list) => {
      if (isMounted) {
        setIpos(list);
        setSelectedIpo((curr) => {
          if (!curr && list.length > 0) {
            return list.find((i) => i.supportType === 'automated') || list[0];
          }
          return curr;
        });
        setIsLoadingIpos(false);
      }
    });

    fetchGmpList().then((gmp) => {
      if (isMounted) {
        setGmpList(gmp);
        setIsLoadingGmp(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Find GMP for selected IPO
  const selectedGmp = useMemo(() => {
    return findGmpForIpo(selectedIpo?.name, gmpList);
  }, [selectedIpo, gmpList]);

  // Profile management handlers
  const handleSaveProfile = (name: string, pan: string, editId?: string) => {
    if (editId) {
      const res = StorageService.updateProfile(editId, name, pan);
      if (res.success && res.profile) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === editId ? res.profile! : p))
        );
        return { success: true };
      }
      return { success: false, error: res.error };
    } else {
      const res = StorageService.addProfile(name, pan);
      if (res.success && res.profile) {
        setProfiles((prev) => [...prev, res.profile!]);
        return { success: true };
      }
      return { success: false, error: res.error };
    }
  };

  const handleDeleteProfile = (id: string) => {
    StorageService.deleteProfile(id);
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    setResults((prev) => prev.filter((r) => r.profileId !== id));
  };

  const handleDeleteAllProfiles = () => {
    StorageService.clearAllProfiles();
    setProfiles([]);
    setResults([]);
  };

  // Main Allotment Check Handler
  const handleCheckAll = async () => {
    if (!selectedIpo || profiles.length === 0 || isChecking) return;

    setIsChecking(true);
    setProgress({ completed: 0, total: profiles.length });
    setResults([]);
    hasScrolledToResults.current = false;

    try {
      await AllotmentService.checkAllProfiles(
        selectedIpo,
        profiles,
        (completed, total, latestResult) => {
          setProgress({ completed, total });
          setResults((prev) => {
            const exists = prev.some((r) => r.profileId === latestResult.profileId);
            if (exists) {
              return prev.map((r) => (r.profileId === latestResult.profileId ? latestResult : r));
            }
            return [...prev, latestResult];
          });

          // Smoothly scroll to results as soon as first result arrives on mobile
          if (!hasScrolledToResults.current) {
            hasScrolledToResults.current = true;
            setTimeout(() => {
              if (typeof resultsRef.current?.scrollIntoView === 'function') {
                resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }, 100);
          }
        }
      );
    } catch (e) {
      console.error('Error during batch allotment check:', e);
    } finally {
      setIsChecking(false);
      setProgress(null);
    }
  };

  // Retry individual profile lookup
  const handleRetryProfile = async (profileId: string) => {
    if (!selectedIpo || retryingId) return;
    const targetProfile = profiles.find((p) => p.id === profileId);
    if (!targetProfile) return;

    setRetryingId(profileId);
    try {
      const singleResult = await AllotmentService.checkProfile(selectedIpo, targetProfile);
      setResults((prev) =>
        prev.map((r) => (r.profileId === profileId ? singleResult : r))
      );
    } catch (e) {
      console.error('Failed to retry profile:', e);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-36 sm:pb-24">
      {/* Top Header */}
      <Header />

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Step 1: Select IPO */}
        <section aria-labelledby="ipo-selection-heading">
          <IpoSelector
            ipos={ipos}
            selectedIpo={selectedIpo}
            onSelect={(ipo) => {
              setSelectedIpo(ipo);
              setResults([]); // Reset results when switching IPO
            }}
            isLoading={isLoadingIpos}
            onRefresh={() => {
              loadIpos(true);
              loadGmp(true);
            }}
            gmpList={gmpList}
          />
        </section>

        {/* Live Market & Grey Market Premium (GMP) Snapshot */}
        {selectedIpo && (
          <section aria-label="Live Market GMP Snapshot">
            <GmpMarketCard
              selectedIpo={selectedIpo}
              gmpEntry={selectedGmp}
              isLoading={isLoadingGmp}
            />
          </section>
        )}

        {/* Step 2: Configure Family PAN Profiles */}
        <section aria-labelledby="profiles-heading">
          <ProfileManager
            profiles={profiles}
            onAddClick={() => {
              setEditingProfile(null);
              setIsModalOpen(true);
            }}
            onEditClick={(p) => {
              setEditingProfile(p);
              setIsModalOpen(true);
            }}
            onDeleteClick={handleDeleteProfile}
            onDeleteAllClick={handleDeleteAllProfiles}
            onSyncClick={() => setIsQrModalOpen(true)}
            disabled={isChecking}
          />
        </section>

        {/* Step 3: Check All PANs Prominent Action */}
        <section aria-labelledby="action-heading">
          <CheckAction
            selectedIpo={selectedIpo}
            profiles={profiles}
            isChecking={isChecking}
            progress={progress}
            onCheckAll={handleCheckAll}
          />
        </section>

        {/* Step 4: Results Display and Summary */}
        {results.length > 0 && (
          <section ref={resultsRef} aria-labelledby="results-heading" className="scroll-mt-6">
            <ResultsSection
              results={results}
              onRetry={handleRetryProfile}
              retryingId={retryingId}
              selectedIpo={selectedIpo}
            />
          </section>
        )}
      </main>

      {/* Profile Add/Edit Modal */}
      <ProfileModal
        key={editingProfile ? editingProfile.id : isModalOpen ? 'open' : 'closed'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProfile(null);
        }}
        onSave={handleSaveProfile}
        editingProfile={editingProfile}
        existingProfiles={profiles}
      />

      {/* QR Profile Sync Modal */}
      <QrSyncModal
        key={isQrModalOpen ? 'qr-open' : 'qr-closed'}
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        profiles={profiles}
        onImportSuccess={() => {
          setProfiles(StorageService.getProfiles());
        }}
      />
    </div>
  );
}

export default App;
