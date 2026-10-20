import { describe, it, expect } from 'vitest';
import { AllotmentService } from '../src/services/allotmentService';
import { IpoItem } from '../src/types/ipo';
import { Profile } from '../src/types/profile';

describe('AllotmentService (Batch & Retry Operations)', () => {
  const mockIpo: IpoItem = {
    id: 'li_mock_1',
    symbol: 'MOCK',
    name: 'Mock Test IPO',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '1001',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/',
  };

  const mockProfiles: Profile[] = [
    { id: 'p1', name: 'User 1', pan: 'ABCDE1111F', createdAt: 1, updatedAt: 1 },
    { id: 'p2', name: 'User 2', pan: 'ABCDE2222F', createdAt: 1, updatedAt: 1 },
    { id: 'p3', name: 'User 3', pan: 'ABCDE3333F', createdAt: 1, updatedAt: 1 },
  ];

  it('runs batch checks and updates progress incrementally', async () => {
    const originalFetch = global.fetch;

    try {
      global.fetch = async (_url, options) => {
        const body = JSON.parse((options?.body as string) || '{}');
        const pan = body.pan;

        if (pan === 'ABCDE1111F') {
          return new Response(
            JSON.stringify({ status: 'allotted', allottedQuantity: 15, message: 'Allotted 15' }),
            { status: 200 }
          );
        } else if (pan === 'ABCDE2222F') {
          return new Response(
            JSON.stringify({ status: 'not_allotted', allottedQuantity: 0, message: 'Not allotted' }),
            { status: 200 }
          );
        } else {
          // p3 network failure
          return new Response(
            JSON.stringify({ status: 'error', message: 'Upstream connection error', canRetry: true }),
            { status: 200 }
          );
        }
      };

      const progressCalls: Array<{ completed: number; total: number }> = [];

      const results = await AllotmentService.checkAllProfiles(
        mockIpo,
        mockProfiles,
        (completed, total) => {
          progressCalls.push({ completed, total });
        }
      );

      expect(results.length).toBe(3);
      expect(progressCalls.length).toBe(3);
      expect(progressCalls[progressCalls.length - 1]).toEqual({ completed: 3, total: 3 });

      // p1 is allotted
      expect(results[0].profileId).toBe('p1');
      expect(results[0].status).toBe('allotted');
      expect(results[0].allottedQuantity).toBe(15);

      // p2 is not_allotted
      expect(results[1].profileId).toBe('p2');
      expect(results[1].status).toBe('not_allotted');

      // p3 is error with retry available
      expect(results[2].profileId).toBe('p3');
      expect(results[2].status).toBe('error');
      expect(results[2].canRetry).toBe(true);

      // Verify that partial failure does not corrupt or wipe out p1 and p2!
      expect(results.filter((r) => r.status === 'allotted').length).toBe(1);
      expect(results.filter((r) => r.status === 'not_allotted').length).toBe(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it('allows individual retries for failed profiles without affecting other profiles', async () => {
    const originalFetch = global.fetch;

    try {
      // First attempt for p3 failed, now on retry it succeeds with not_allotted
      global.fetch = async () =>
        new Response(
          JSON.stringify({
            status: 'not_allotted',
            allottedQuantity: 0,
            message: 'Application verified, not allotted',
            canRetry: false,
          }),
          { status: 200 }
        );

      const retriedResult = await AllotmentService.checkProfile(mockIpo, mockProfiles[2]);
      expect(retriedResult.profileId).toBe('p3');
      expect(retriedResult.status).toBe('not_allotted');
      expect(retriedResult.canRetry).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
