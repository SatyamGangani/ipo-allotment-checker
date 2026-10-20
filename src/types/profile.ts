export interface Profile {
  id: string;
  name: string;
  pan: string;
  createdAt: number;
  updatedAt: number;
}

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/**
 * Normalizes a PAN string by trimming and converting to uppercase.
 */
export function normalizePan(pan: string): string {
  return pan.trim().toUpperCase();
}

/**
 * Validates whether a PAN follows the standard 10-character Indian PAN format.
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter.
 */
export function validatePan(pan: string): boolean {
  return PAN_REGEX.test(normalizePan(pan));
}

/**
 * Masks a PAN for safe display in the UI.
 * Example: ABCDE1234F -> ABC•••234F
 */
export function maskPan(pan: string): string {
  const normalized = normalizePan(pan);
  if (normalized.length !== 10) return normalized;
  return `${normalized.slice(0, 3)}•••${normalized.slice(6)}`;
}

/**
 * Returns validation error message for a PAN input, checking format and uniqueness.
 */
export function validateProfileInput(
  name: string,
  pan: string,
  existingProfiles: Profile[] = [],
  editingId?: string
): { nameError?: string; panError?: string } {
  const errors: { nameError?: string; panError?: string } = {};

  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.nameError = 'Name or nickname is required';
  } else if (trimmedName.length > 50) {
    errors.nameError = 'Name is too long (max 50 characters)';
  }

  const normalizedPan = normalizePan(pan);
  if (!normalizedPan) {
    errors.panError = 'PAN number is required';
  } else if (!validatePan(normalizedPan)) {
    errors.panError = 'Invalid PAN format (e.g. ABCDE1234F)';
  } else {
    const isDuplicate = existingProfiles.some(
      (p) => p.pan === normalizedPan && p.id !== editingId
    );
    if (isDuplicate) {
      errors.panError = 'A profile with this PAN already exists';
    }
  }

  return errors;
}
