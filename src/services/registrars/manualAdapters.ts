import { RegistrarAdapter, RegistrarCheckParams, NormalizedLookupResult } from './types';
import { RegistrarCode, REGISTRAR_META } from '../../types/ipo';

export class ManualCheckAdapter implements RegistrarAdapter {
  readonly code: RegistrarCode;
  readonly name: string;
  private readonly manualUrl: string;
  private readonly customReason?: string;

  constructor(code: RegistrarCode, customReason?: string) {
    this.code = code;
    const meta = REGISTRAR_META[code] || REGISTRAR_META.OTHER;
    this.name = meta.name;
    this.manualUrl = meta.officialUrl;
    this.customReason = customReason || meta.reason;
  }

  async checkAllotment(_params: RegistrarCheckParams): Promise<NormalizedLookupResult> {
    return {
      status: 'manual_check',
      message: `${this.name} requires interactive verification (${this.customReason}). Click below to verify on their official portal.`,
      canRetry: false,
      manualUrl: this.manualUrl,
    };
  }
}
