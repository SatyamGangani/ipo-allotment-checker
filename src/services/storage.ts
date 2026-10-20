import { Profile, normalizePan, validatePan } from '../types/profile';

const STORAGE_KEY = 'ipo_checker_pan_profiles_v1';

export class StorageService {
  /**
   * Retrieves all saved PAN profiles from localStorage.
   */
  static getProfiles(): Profile[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed;
    } catch (e) {
      console.error('Failed to load profiles from localStorage:', e);
      return [];
    }
  }

  /**
   * Saves profiles to localStorage.
   */
  static saveProfiles(profiles: Profile[]): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
      return true;
    } catch (e) {
      console.error('Failed to persist profiles to localStorage:', e);
      return false;
    }
  }

  /**
   * Adds a new profile.
   * Enforces PAN normalization, validation, and uniqueness.
   */
  static addProfile(name: string, pan: string): { success: boolean; profile?: Profile; error?: string } {
    const trimmedName = name.trim();
    const normalizedPan = normalizePan(pan);

    if (!trimmedName) {
      return { success: false, error: 'Name is required' };
    }
    if (!validatePan(normalizedPan)) {
      return { success: false, error: 'Invalid PAN format. Standard format is 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)' };
    }

    const current = this.getProfiles();
    const isDuplicate = current.some((p) => p.pan === normalizedPan);
    if (isDuplicate) {
      return { success: false, error: 'A profile with this PAN already exists' };
    }

    const newProfile: Profile = {
      id: `pan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: trimmedName,
      pan: normalizedPan,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [...current, newProfile];
    this.saveProfiles(updated);
    return { success: true, profile: newProfile };
  }

  /**
   * Updates an existing profile.
   */
  static updateProfile(
    id: string,
    name: string,
    pan: string
  ): { success: boolean; profile?: Profile; error?: string } {
    const trimmedName = name.trim();
    const normalizedPan = normalizePan(pan);

    if (!trimmedName) {
      return { success: false, error: 'Name is required' };
    }
    if (!validatePan(normalizedPan)) {
      return { success: false, error: 'Invalid PAN format (e.g. ABCDE1234F)' };
    }

    const current = this.getProfiles();
    const targetIndex = current.findIndex((p) => p.id === id);
    if (targetIndex === -1) {
      return { success: false, error: 'Profile not found' };
    }

    // Check duplicate PAN on other profiles
    const isDuplicate = current.some((p) => p.pan === normalizedPan && p.id !== id);
    if (isDuplicate) {
      return { success: false, error: 'Another profile with this PAN already exists' };
    }

    const updatedProfile: Profile = {
      ...current[targetIndex],
      name: trimmedName,
      pan: normalizedPan,
      updatedAt: Date.now(),
    };

    current[targetIndex] = updatedProfile;
    this.saveProfiles(current);
    return { success: true, profile: updatedProfile };
  }

  /**
   * Deletes a profile by ID.
   */
  static deleteProfile(id: string): boolean {
    const current = this.getProfiles();
    const filtered = current.filter((p) => p.id !== id);
    return this.saveProfiles(filtered);
  }

  /**
   * Clears all saved profiles from localStorage.
   */
  static clearAllProfiles(): boolean {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('Failed to clear profiles from localStorage:', e);
      return false;
    }
  }
}
