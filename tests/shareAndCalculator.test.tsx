import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ShareModal } from '../src/components/ShareModal';
import { ListingGainCalculator } from '../src/components/ListingGainCalculator';
import { QrSyncModal } from '../src/components/QrSyncModal';
import { ProfileAllotmentResult } from '../src/types/allotment';
import { StorageService } from '../src/services/storage';

const mockResults: ProfileAllotmentResult[] = [
  {
    profileId: 'p1',
    profileName: 'Satyam',
    pan: 'ABCDE1234F',
    status: 'allotted',
    allottedQuantity: 25,
    appliedQuantity: 25,
    message: 'Congratulations! Allotted 25 shares',
    canRetry: false,
    checkedAt: Date.now(),
  },
  {
    profileId: 'p2',
    profileName: 'Papa',
    pan: 'BCDEF2345G',
    status: 'not_allotted',
    allottedQuantity: 0,
    appliedQuantity: 25,
    message: 'Application verified, but 0 shares allotted',
    canRetry: false,
    checkedAt: Date.now(),
  },
  {
    profileId: 'p3',
    profileName: 'Friend',
    pan: 'CDEFG3456H',
    status: 'not_applied',
    message: 'No application record found',
    canRetry: false,
    checkedAt: Date.now(),
  },
];

describe('ShareModal Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders with all profiles selected and formats allotment as 1 Lot (25 Shares)', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        results={mockResults}
        ipoName="Bonfiglioli Transmissions Limited - IPO"
      />
    );

    expect(screen.getByText('Share Allotment Results')).toBeDefined();
    expect(screen.getByText('Bonfiglioli Transmissions Limited - IPO')).toBeDefined();

    // Check preview contains 1 Lot (25 Shares) formatting
    const preview = screen.getByText(/🎉 IPO Allotment: Bonfiglioli Transmissions/);
    expect(preview.textContent).toContain('✅ Satyam: 1 Lot (25 Shares) Allotted! 🚀');
    expect(preview.textContent).toContain('❌ Papa: Not Allotted');
    expect(preview.textContent).toContain('➖ Friend: Not Applied');
    expect(preview.textContent).toContain('Total: 1 Lot (25 Shares) allotted across 1 family member');
  });

  it('allows deselecting a particular user (e.g. Friend) and updates message preview', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        results={mockResults}
        ipoName="Bonfiglioli Transmissions Limited - IPO"
      />
    );

    // Click on "Friend" button in selection list to uncheck them
    const friendBtn = screen.getByRole('button', { name: /Friend/i });
    fireEvent.click(friendBtn);

    // Message preview should no longer contain "Friend"
    const preview = screen.getByText(/🎉 IPO Allotment: Bonfiglioli Transmissions/);
    expect(preview.textContent).not.toContain('Friend');
    expect(preview.textContent).toContain('Satyam');
    expect(preview.textContent).toContain('Papa');
  });

  it('supports Deselect All and Select All toggles', () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        results={mockResults}
        ipoName="Bonfiglioli Transmissions Limited - IPO"
      />
    );

    // Click "Deselect All"
    const toggleBtn = screen.getByRole('button', { name: /Deselect All/i });
    fireEvent.click(toggleBtn);

    // Should now show empty selection warning
    expect(
      screen.getByText('Please select at least one family member to generate a shareable summary.')
    ).toBeDefined();

    // Click "Select All" again
    const selectAllBtn = screen.getByRole('button', { name: /Select All/i });
    fireEvent.click(selectAllBtn);

    const preview = screen.getByText(/🎉 IPO Allotment: Bonfiglioli Transmissions/);
    expect(preview.textContent).toContain('Satyam');
  });

  it('copies message to clipboard when Copy Text is clicked', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: writeTextMock },
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        results={mockResults}
        ipoName="Bonfiglioli Transmissions Limited - IPO"
      />
    );

    const copyBtn = screen.getByRole('button', { name: /Copy Text/i });
    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    expect(await screen.findByText('Copied to Clipboard!')).toBeDefined();
  });
});

describe('ListingGainCalculator Component', () => {
  it('does not render if there are no allotted shares', () => {
    const noAllotmentResults: ProfileAllotmentResult[] = [
      {
        profileId: 'p2',
        profileName: 'Papa',
        pan: 'BCDEF2345G',
        status: 'not_allotted',
        message: 'No shares allotted',
        canRetry: false,
        checkedAt: Date.now(),
      },
    ];

    const { container } = render(
      <ListingGainCalculator results={noAllotmentResults} ipoName="Test IPO" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('defaults to Percentage (%) mode (priority) and calculates profit on 1 Lot', () => {
    render(
      <ListingGainCalculator results={mockResults} ipoName="Bonfiglioli Transmissions" />
    );

    expect(screen.getByText('Listing Gain & Profit Estimator')).toBeDefined();
    expect(screen.getByText('Percentage (%) Mode')).toBeDefined();

    // Default 35% on standard retail lot of ₹15,000 gives ₹5,250
    expect(screen.getByText('₹5,250')).toBeDefined();
    expect(screen.getByText(/1 Lot \(25 shares\) @ \+35% listing gain/)).toBeDefined();
  });

  it('updates profit dynamically when clicking preset percentages', () => {
    render(
      <ListingGainCalculator results={mockResults} ipoName="Bonfiglioli Transmissions" />
    );

    // Click "+50%" preset pill
    const preset50Btn = screen.getByRole('button', { name: /\+50%/i });
    fireEvent.click(preset50Btn);

    // 1 Lot * ₹15,000 * 50% = ₹7,500
    expect(screen.getByText('₹7,500')).toBeDefined();

    // Click "+100%" preset pill
    const preset100Btn = screen.getByRole('button', { name: /\+100%/i });
    fireEvent.click(preset100Btn);

    // 1 Lot * ₹15,000 * 100% = ₹15,000
    expect(screen.getByText('₹15,000')).toBeDefined();
  });

  it('switches to ₹ Amount mode and calculates correctly', () => {
    render(
      <ListingGainCalculator results={mockResults} ipoName="Bonfiglioli Transmissions" />
    );

    // Click ₹ Amount Mode toggle button
    const amountModeBtn = screen.getByRole('button', { name: /₹ Amount Mode/i });
    fireEvent.click(amountModeBtn);

    // Default gain in amount mode is ₹50/share -> 25 shares * ₹50 = ₹1,250
    expect(screen.getByText('₹1,250')).toBeDefined();
    expect(screen.getByText(/25 shares × ₹50 gain\/share/)).toBeDefined();

    // Click "+₹100" preset pill in amount mode
    const preset100Btn = screen.getByRole('button', { name: /\+₹100/i });
    fireEvent.click(preset100Btn);

    // 25 shares * ₹100 = ₹2,500
    expect(screen.getByText('₹2,500')).toBeDefined();
  });
});

describe('QrSyncModal Component & Storage Import', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('StorageService.importProfiles imports new profiles and ignores duplicates', () => {
    // Seed existing
    StorageService.addProfile('Satyam', 'ABCDE1234F');

    const incoming = [
      { name: 'Papa', pan: 'BCDEF2345G' }, // New
      { name: 'Satyam Duplicate', pan: 'ABCDE1234F' }, // Duplicate PAN
      { name: 'Invalid', pan: 'WRONGPAN' }, // Invalid PAN
    ];

    const result = StorageService.importProfiles(incoming);
    expect(result.added.length).toBe(1);
    expect(result.added[0].name).toBe('Papa');
    expect(result.skippedCount).toBe(2);

    const all = StorageService.getProfiles();
    expect(all.length).toBe(2);
  });

  it('renders QrSyncModal with share and scan tabs', async () => {
    const profiles = [
      {
        id: 'p1',
        name: 'Satyam',
        pan: 'ABCDE1234F',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    render(
      <QrSyncModal
        isOpen={true}
        onClose={vi.fn()}
        profiles={profiles}
        onImportSuccess={vi.fn()}
      />
    );

    expect(screen.getByText('QR Profile Sync')).toBeDefined();
    expect(screen.getByText(/Share via QR/i)).toBeDefined();
    expect(screen.getByText(/Scan QR/i)).toBeDefined();

    // Allows deselecting / selecting profiles
    expect(screen.getByText('Choose Profiles to Share')).toBeDefined();
  });
});
