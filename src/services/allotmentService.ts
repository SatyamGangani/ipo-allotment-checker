import { IpoItem } from '../types/ipo';
import { Profile } from '../types/profile';
import { ProfileAllotmentResult } from '../types/allotment';
import { getRegistrarAdapter } from './registrars/registry';

export class AllotmentService {
  /**
   * Checks allotment for a single profile.
   */
  static async checkProfile(
    ipo: IpoItem,
    profile: Profile
  ): Promise<ProfileAllotmentResult> {
    const adapter = getRegistrarAdapter(ipo.registrar);

    try {
      const result = await adapter.checkAllotment({
        pan: profile.pan,
        companyId: ipo.registrarCompanyId,
        symbol: ipo.symbol,
        bseId: ipo.bseId,
      });

      return {
        profileId: profile.id,
        profileName: profile.name,
        pan: profile.pan,
        status: result.status,
        allottedQuantity: result.allottedQuantity,
        appliedQuantity: result.appliedQuantity,
        applicantName: result.applicantName,
        message: result.message,
        canRetry: result.canRetry,
        manualUrl: result.manualUrl || ipo.officialUrl,
        checkedAt: Date.now(),
      };
    } catch (e) {
      return {
        profileId: profile.id,
        profileName: profile.name,
        pan: profile.pan,
        status: 'error',
        message: `Lookup failed: ${(e as Error).message || 'Unknown network error'}`,
        canRetry: true,
        manualUrl: ipo.officialUrl,
        checkedAt: Date.now(),
      };
    }
  }

  /**
   * Checks allotment for all configured profiles with controlled concurrency (max 2 at a time).
   * Calls onProgress callback as each individual profile check finishes.
   */
  static async checkAllProfiles(
    ipo: IpoItem,
    profiles: Profile[],
    onProgress?: (completed: number, total: number, result: ProfileAllotmentResult) => void
  ): Promise<ProfileAllotmentResult[]> {
    if (profiles.length === 0) return [];

    const total = profiles.length;
    let completedCount = 0;
    const results: ProfileAllotmentResult[] = [];

    // Concurrency pool with maximum 2 in-flight requests to respect registrar rate limits
    const CONCURRENCY = 2;
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < profiles.length) {
        const index = currentIndex++;
        const profile = profiles[index];

        const result = await this.checkProfile(ipo, profile);
        results.push(result);
        completedCount++;

        if (onProgress) {
          onProgress(completedCount, total, result);
        }

        // Small delay between requests to be polite to registrar APIs
        if (currentIndex < profiles.length) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(CONCURRENCY, profiles.length) },
      () => worker()
    );

    await Promise.all(workers);

    // Sort results to match original profiles order
    return profiles.map(
      (p) => results.find((r) => r.profileId === p.id)!
    );
  }
}
