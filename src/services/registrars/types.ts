import { AllotmentStatus } from '../../types/allotment';
import { RegistrarCode } from '../../types/ipo';

export interface RegistrarCheckParams {
  pan: string;
  companyId?: string;
  symbol?: string;
  bseId?: string;
  timeoutMs?: number;
}

export interface NormalizedLookupResult {
  status: AllotmentStatus;
  allottedQuantity?: number;
  appliedQuantity?: number;
  applicantName?: string;
  message: string;
  canRetry: boolean;
  manualUrl?: string;
  rawDetails?: unknown;
}

export interface RegistrarAdapter {
  readonly code: RegistrarCode;
  readonly name: string;
  checkAllotment(params: RegistrarCheckParams): Promise<NormalizedLookupResult>;
}
