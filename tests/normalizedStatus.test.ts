import { describe, it, expect } from 'vitest';
import { getRegistrarAdapter } from '../src/services/registrars/registry';
import { computeSummary, ProfileAllotmentResult } from '../src/types/allotment';

describe('Normalized Status & Adapter Integrity', () => {
  it('correctly returns manual_check for CAPTCHA/WAF-blocked registrars without pretending lookup succeeded', async () => {
    // BSE
    const bseAdapter = getRegistrarAdapter('BSE');
    const bseResult = await bseAdapter.checkAllotment({ pan: 'ABCDE1234F' });
    expect(bseResult.status).toBe('manual_check');
    expect(bseResult.manualUrl).toBe('https://www.bseindia.com/investors/appli_check.aspx');
    expect(bseResult.message).toContain('Akamai');

    // NSE
    const nseAdapter = getRegistrarAdapter('NSE');
    const nseResult = await nseAdapter.checkAllotment({ pan: 'ABCDE1234F' });
    expect(nseResult.status).toBe('manual_check');
    expect(nseResult.manualUrl).toBe('https://www.nseindia.com/invest/check-trades-bids-verify-ipo-bids');

    // Purva
    const purvaAdapter = getRegistrarAdapter('PURVA');
    const purvaResult = await purvaAdapter.checkAllotment({ pan: 'ABCDE1234F' });
    expect(purvaResult.status).toBe('manual_check');
    expect(purvaResult.manualUrl).toBe('https://www.purvashare.com/investor-service/ipo-query');
  });

  it('correctly maps proxy API responses for automated registrars', async () => {
    const linkIntimeAdapter = getRegistrarAdapter('LINKINTIME');

    // Mock global fetch for Link Intime proxy
    const originalFetch = global.fetch;

    try {
      // 1. Allotted scenario
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            status: 'allotted',
            allottedQuantity: 30,
            appliedQuantity: 30,
            applicantName: 'SATYAM GANGANI',
            message: 'Congratulations! Allotted 30 shares',
            canRetry: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const allottedRes = await linkIntimeAdapter.checkAllotment({
        pan: 'ABCDE1234F',
        companyId: '1234',
      });
      expect(allottedRes.status).toBe('allotted');
      expect(allottedRes.allottedQuantity).toBe(30);

      // 2. Confirmed Not Allotted scenario (applied, but 0 shares allotted)
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            status: 'not_allotted',
            allottedQuantity: 0,
            appliedQuantity: 30,
            applicantName: 'FAMILY MEMBER',
            message: 'Application verified, but no shares were allotted',
            canRetry: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const notAllottedRes = await linkIntimeAdapter.checkAllotment({
        pan: 'ABCDE1234F',
        companyId: '1234',
      });
      expect(notAllottedRes.status).toBe('not_allotted');
      expect(notAllottedRes.allottedQuantity).toBe(0);

      // 3. Not Applied scenario (no record found)
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            status: 'not_applied',
            message: 'No application record found for this PAN in this issue',
            canRetry: false,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const notAppliedRes = await linkIntimeAdapter.checkAllotment({
        pan: 'ABCDE1234F',
        companyId: '1234',
      });
      expect(notAppliedRes.status).toBe('not_applied');

      // 4. Critical: Upstream Server Error MUST NOT be interpreted as "Not Allotted"
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            status: 'error',
            message: 'Link Intime server returned HTTP 500',
            canRetry: true,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );

      const errorRes = await linkIntimeAdapter.checkAllotment({
        pan: 'ABCDE1234F',
        companyId: '1234',
      });
      expect(errorRes.status).toBe('error');
      expect(errorRes.status).not.toBe('not_allotted'); // STRICT RULE
      expect(errorRes.canRetry).toBe(true);

      // 5. Critical: Timeout / Network failure MUST NOT be interpreted as "Not Allotted"
      global.fetch = async () => {
        throw new Error('Connection timed out after 12000ms');
      };

      const timeoutRes = await linkIntimeAdapter.checkAllotment({
        pan: 'ABCDE1234F',
        companyId: '1234',
      });
      expect(timeoutRes.status).toBe('error');
      expect(timeoutRes.status).not.toBe('not_allotted');
      expect(timeoutRes.canRetry).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('computes summary counts without ever mixing failed checks with confirmed non-allotments', () => {
    const mockResults: ProfileAllotmentResult[] = [
      {
        profileId: '1',
        profileName: 'Me',
        pan: 'ABCDE1234F',
        status: 'allotted',
        allottedQuantity: 15,
        message: 'Allotted 15',
        canRetry: false,
        checkedAt: 1,
      },
      {
        profileId: '2',
        profileName: 'Father',
        pan: 'XYZPA1234K',
        status: 'not_allotted',
        allottedQuantity: 0,
        message: 'Not allotted',
        canRetry: false,
        checkedAt: 1,
      },
      {
        profileId: '3',
        profileName: 'Sister',
        pan: 'JKZPM1234L',
        status: 'not_applied',
        message: 'Not applied',
        canRetry: false,
        checkedAt: 1,
      },
      {
        profileId: '4',
        profileName: 'Brother',
        pan: 'DGLPP1234M',
        status: 'error',
        message: 'Timeout occurred',
        canRetry: true,
        checkedAt: 1,
      },
      {
        profileId: '5',
        profileName: 'Spouse',
        pan: 'AJVPP1234N',
        status: 'manual_check',
        message: 'Check on portal',
        canRetry: false,
        checkedAt: 1,
      },
    ];

    const summary = computeSummary(mockResults);
    expect(summary.total).toBe(5);
    expect(summary.allotted).toBe(1);
    expect(summary.notAllotted).toBe(1);
    expect(summary.notApplied).toBe(1);
    expect(summary.error).toBe(1);
    expect(summary.manualCheck).toBe(1);

    // Ensure error count is separate from notAllotted
    expect(summary.notAllotted).not.toBe(summary.notAllotted + summary.error);
  });
});
