import { describe, it, expect, beforeEach } from 'vitest';
import {
  validatePan,
  normalizePan,
  maskPan,
  validateProfileInput,
} from '../src/types/profile';
import { StorageService } from '../src/services/storage';

describe('PAN Validation & Masking', () => {
  it('validates standard Indian PAN formats', () => {
    // Valid PANs: 5 letters, 4 digits, 1 letter
    expect(validatePan('ABCDE1234F')).toBe(true);
    expect(validatePan('XYZPA9876K')).toBe(true);
    expect(validatePan('abcde1234f')).toBe(true); // normalize converts to uppercase

    // Invalid PANs
    expect(validatePan('ABC1234F')).toBe(false); // too short
    expect(validatePan('ABCDEF1234F')).toBe(false); // 6 letters
    expect(validatePan('12345ABCDE')).toBe(false); // wrong order
    expect(validatePan('ABCDE12345')).toBe(false); // ends with digit
    expect(validatePan('ABCDE1234')).toBe(false); // 9 characters
    expect(validatePan('')).toBe(false); // empty
    expect(validatePan('ABCDE 1234F')).toBe(false); // spaces inside
  });

  it('normalizes PAN to trimmed uppercase', () => {
    expect(normalizePan('  abcde1234f  ')).toBe('ABCDE1234F');
    expect(normalizePan('xyzpm9999k')).toBe('XYZPM9999K');
  });

  it('masks PAN correctly for display without revealing sensitive middle characters', () => {
    expect(maskPan('ABCDE1234F')).toBe('ABC•••234F');
    expect(maskPan('XYZPM9999K')).toBe('XYZ•••999K');
    expect(maskPan('abcde1234f')).toBe('ABC•••234F');
  });

  it('validates profile input including duplicate prevention', () => {
    const existing = [
      {
        id: '1',
        name: 'Me',
        pan: 'ABCDE1234F',
        createdAt: 1,
        updatedAt: 1,
      },
    ];

    // Missing name
    expect(validateProfileInput('', 'XYZPA1234K').nameError).toBeDefined();

    // Invalid PAN
    expect(validateProfileInput('Brother', 'INVALID').panError).toBeDefined();

    // Duplicate PAN
    expect(validateProfileInput('Brother', 'ABCDE1234F', existing).panError).toBe(
      'A profile with this PAN already exists'
    );

    // Same PAN allowed when editing the same profile
    expect(
      validateProfileInput('Me (Renamed)', 'ABCDE1234F', existing, '1').panError
    ).toBeUndefined();

    // Valid unique PAN
    const valid = validateProfileInput('Sister', 'XYZPA9999L', existing);
    expect(valid.nameError).toBeUndefined();
    expect(valid.panError).toBeUndefined();
  });
});

describe('StorageService (localStorage Persistence)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds, updates, retrieves, and deletes profiles', () => {
    expect(StorageService.getProfiles()).toEqual([]);

    // Add profile 1
    const add1 = StorageService.addProfile('Self', 'ABCDE1234F');
    expect(add1.success).toBe(true);
    expect(add1.profile?.name).toBe('Self');
    expect(add1.profile?.pan).toBe('ABCDE1234F');

    // Duplicate add should fail
    const dup = StorageService.addProfile('Other', 'ABCDE1234F');
    expect(dup.success).toBe(false);
    expect(dup.error).toContain('already exists');

    // Add profile 2
    const add2 = StorageService.addProfile('Father', 'XYZPA9876K');
    expect(add2.success).toBe(true);

    let profiles = StorageService.getProfiles();
    expect(profiles.length).toBe(2);

    // Update profile 1
    const update = StorageService.updateProfile(add1.profile!.id, 'Self (Primary)', 'ABCDE1234F');
    expect(update.success).toBe(true);
    expect(update.profile?.name).toBe('Self (Primary)');

    // Delete profile 2
    StorageService.deleteProfile(add2.profile!.id);
    profiles = StorageService.getProfiles();
    expect(profiles.length).toBe(1);
    expect(profiles[0].id).toBe(add1.profile!.id);

    // Clear all
    StorageService.clearAllProfiles();
    expect(StorageService.getProfiles()).toEqual([]);
  });
});
