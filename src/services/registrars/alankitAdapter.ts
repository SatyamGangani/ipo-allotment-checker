import { RegistrarAdapter, RegistrarCheckParams, NormalizedLookupResult } from './types';

export class AlankitAdapter implements RegistrarAdapter {
  readonly code = 'ALANKIT' as const;
  readonly name = 'Alankit Assignments';

  async checkAllotment(params: RegistrarCheckParams): Promise<NormalizedLookupResult> {
    try {
      const resp = await fetch('/api/check-allotment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrar: this.code,
          companyId: params.companyId,
          pan: params.pan,
          symbol: params.symbol,
        }),
      });

      if (!resp.ok) {
        return {
          status: 'error',
          message: `Proxy server responded with HTTP ${resp.status}`,
          canRetry: true,
        };
      }

      const data = await resp.json();
      return {
        status: data.status,
        allottedQuantity: data.allottedQuantity,
        appliedQuantity: data.appliedQuantity,
        applicantName: data.applicantName,
        message: data.message || 'Status retrieved',
        canRetry: !!data.canRetry,
        manualUrl: 'https://ipo.alankit.com/',
      };
    } catch (e) {
      return {
        status: 'error',
        message: `Network error: ${(e as Error).message}`,
        canRetry: true,
      };
    }
  }
}
