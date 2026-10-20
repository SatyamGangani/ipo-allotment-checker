import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '../src/App';

describe('App Integration Flow', () => {
  beforeEach(() => {
    localStorage.clear();
    // Default fetch mock for /api/ipos
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/ipos')) {
        return new Response(
          JSON.stringify({
            success: true,
            ipos: [
              {
                id: 'li_test_1',
                symbol: 'TESTIPO',
                name: 'Test IPO Ltd',
                registrar: 'LINKINTIME',
                registrarName: 'Link Intime',
                registrarCompanyId: '1234',
                supportType: 'automated',
                supportReason: 'Direct automated PAN lookup supported',
                officialUrl: 'https://in.mpms.mufg.com/',
              },
            ],
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    });
  });

  it('renders header, IPO selector, and empty profile prompt initially', async () => {
    render(<App />);

    expect(screen.getByText('IPO Check')).toBeDefined();
    expect(
      screen.getByText(/Your profiles are saved locally on this device/i)
    ).toBeDefined();

    // Verify IPO selector renders
    await waitFor(() => {
      expect(screen.getByText('Test IPO Ltd')).toBeDefined();
    });

    // Verify empty profile prompt
    expect(screen.getByText('No PAN profiles saved yet')).toBeDefined();
    expect(screen.getByText('Add First Family Member PAN')).toBeDefined();
  });

  it('allows adding a family member profile with masked PAN display and duplicate prevention', async () => {
    render(<App />);

    // Click "Add PAN"
    const addBtn = screen.getByRole('button', { name: /Add PAN/i });
    fireEvent.click(addBtn);

    // Modal opens
    expect(screen.getByText('Add Family Member PAN')).toBeDefined();

    const nameInput = screen.getByPlaceholderText(/e.g. Me, Father/i);
    const panInput = screen.getByPlaceholderText('ABCDE1234F');
    const submitBtn = screen.getByRole('button', { name: /Add Profile/i });

    // Try submitting with invalid PAN
    fireEvent.change(nameInput, { target: { value: 'Me' } });
    fireEvent.change(panInput, { target: { value: 'INVALID' } });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Invalid PAN format/i)).toBeDefined();

    // Fix PAN to valid format
    fireEvent.change(panInput, { target: { value: 'ABCDE1234F' } });
    fireEvent.click(submitBtn);

    // Profile card should now appear in the list with MASKED PAN
    await waitFor(() => {
      expect(screen.getByText('Me')).toBeDefined();
      expect(screen.getByText('ABC•••234F')).toBeDefined();
    });

    // Try adding the same PAN again -> should show duplicate error
    fireEvent.click(screen.getByRole('button', { name: /Add PAN/i }));
    const nameInput2 = screen.getByPlaceholderText(/e.g. Me, Father/i);
    const panInput2 = screen.getByPlaceholderText('ABCDE1234F');
    fireEvent.change(nameInput2, { target: { value: 'Brother' } });
    fireEvent.change(panInput2, { target: { value: 'ABCDE1234F' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Profile/i }));

    expect(
      await screen.findByText('A profile with this PAN already exists')
    ).toBeDefined();
  });

  it('executes batch check and displays normalized result and summary', async () => {
    // Seed localStorage with a profile
    localStorage.setItem(
      'ipo_checker_pan_profiles_v1',
      JSON.stringify([
        {
          id: 'test_p1',
          name: 'Dad',
          pan: 'ABCDE1234F',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ])
    );

    // Mock fetch for allotment check
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/api/ipos')) {
        return new Response(
          JSON.stringify({
            success: true,
            ipos: [
              {
                id: 'li_test_1',
                symbol: 'TESTIPO',
                name: 'Test IPO Ltd',
                registrar: 'LINKINTIME',
                registrarName: 'Link Intime',
                registrarCompanyId: '1234',
                supportType: 'automated',
                supportReason: 'Direct automated PAN lookup supported',
                officialUrl: 'https://in.mpms.mufg.com/',
              },
            ],
          }),
          { status: 200 }
        );
      }

      if (url.includes('/api/check-allotment')) {
        return new Response(
          JSON.stringify({
            status: 'allotted',
            allottedQuantity: 25,
            appliedQuantity: 25,
            message: 'Congratulations! Allotted 25 shares',
            canRetry: false,
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
    });

    render(<App />);

    // Profile Dad should be loaded
    await waitFor(() => {
      expect(screen.getByText('Dad')).toBeDefined();
    });

    // Click "Check All PANs"
    const checkAllBtn = screen.getByRole('button', { name: /Check All PANs/i });
    fireEvent.click(checkAllBtn);

    // Verify result card and summary appear
    await waitFor(() => {
      expect(screen.getByText('25 Shares')).toBeDefined();
      expect(screen.getByText(/Congratulations! Allotted 25 shares/i)).toBeDefined();
      // Summary card count: Allotted 1
      expect(screen.getByText('Allotment Results (1)')).toBeDefined();
    });
  });
});
