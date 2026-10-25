import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { GmpMarketCard } from '../src/components/GmpMarketCard';
import { findGmpForIpo, GmpEntry } from '../src/services/gmpService';
import { IpoItem } from '../src/types/ipo';

describe('gmpService - findGmpForIpo matching', () => {
  const mockGmpList: GmpEntry[] = [
    {
      name: 'Bonfiglioli Transmissions',
      cleanName: 'bonfigliolitransmissions',
      gmp: 66,
      pct: 11.26,
      price: 586,
      lotSize: 25,
      indicativePrice: 652,
      source: 'InvestorGain',
    },
    {
      name: 'Tonbo Imaging India',
      cleanName: 'tonboimaging',
      gmp: 452,
      pct: 64.57,
      price: 700,
      lotSize: 21,
      indicativePrice: 1152,
      source: 'InvestorGain',
    },
  ];

  it('matches registrar IPO name with suffix (e.g. "Bonfiglioli Transmissions Limited - IPO")', () => {
    const match = findGmpForIpo('Bonfiglioli Transmissions Limited - IPO', mockGmpList);
    expect(match).toBeDefined();
    expect(match?.name).toBe('Bonfiglioli Transmissions');
    expect(match?.gmp).toBe(66);
    expect(match?.pct).toBe(11.26);
    expect(match?.price).toBe(586);
    expect(match?.lotSize).toBe(25);
  });

  it('returns null if IPO has no matching GMP data', () => {
    const match = findGmpForIpo('Unknown Obscure Company Limited', mockGmpList);
    expect(match).toBeNull();
  });
});

describe('GmpMarketCard Component', () => {
  const sampleIpo: IpoItem = {
    id: 'li_1',
    symbol: 'BONFIG',
    name: 'Bonfiglioli Transmissions Limited - IPO',
    registrar: 'LINKINTIME',
    registrarName: 'Link Intime',
    registrarCompanyId: '99',
    supportType: 'automated',
    supportReason: 'Direct automated PAN lookup supported',
    officialUrl: 'https://in.mpms.mufg.com/',
  };

  const sampleGmp: GmpEntry = {
    name: 'Bonfiglioli Transmissions',
    cleanName: 'bonfigliolitransmissions',
    gmp: 66,
    pct: 11.26,
    price: 586,
    lotSize: 25,
    indicativePrice: 652,
    source: 'InvestorGain',
  };

  it('renders live GMP hero metrics: priority percentage (+11.3%), ₹ per share (+₹66), issue price and retail lot profit', () => {
    render(<GmpMarketCard selectedIpo={sampleIpo} gmpEntry={sampleGmp} />);

    // Check title and live badge
    expect(screen.getByText('Live Grey Market Premium (GMP)')).toBeDefined();
    expect(screen.getByText(/Live via InvestorGain/i)).toBeDefined();

    // Check priority percentage
    expect(screen.getByText('+11.3%')).toBeDefined();

    // Check ₹ per share
    expect(screen.getByText('+₹66')).toBeDefined();

    // Check Issue price
    expect(screen.getByText('₹586')).toBeDefined();

    // Check Est. Listing Price
    expect(screen.getByText('₹652')).toBeDefined();

    // Check standard retail lot formatting
    expect(screen.getByText(/1 Lot \(25 Shares\)/i)).toBeDefined();

    // Check estimated profit per retail lot: 25 * 66 = 1650
    expect(screen.getByText('+₹1,650')).toBeDefined();
  });

  it('renders official listing performance when share is listed on BSE/NSE', () => {
    const listedGmp: GmpEntry = {
      name: 'Bonfiglioli Transmissions',
      cleanName: 'bonfigliolitransmissions',
      gmp: 66,
      pct: 11.26,
      price: 586,
      lotSize: 25,
      source: 'InvestorGain',
      isListed: true,
      listingPrice: 586,
      listingGainPct: 0.0,
      listingGainPerShare: 0,
      listingDate: '23-Oct',
    };

    render(<GmpMarketCard selectedIpo={sampleIpo} gmpEntry={listedGmp} />);

    // Header & badge
    expect(screen.getByText('Official Listing Performance')).toBeDefined();
    expect(screen.getByText(/LISTED • 23-OCT/i)).toBeDefined();
    expect(screen.getByText(/Official Debut via InvestorGain/i)).toBeDefined();

    // Listing metrics
    expect(screen.getByText('0.0%')).toBeDefined();
    expect(screen.getAllByText(/₹586/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/₹0/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Flat market debut/i)).toBeDefined();
    expect(screen.getByText(/This share is officially listed and trading/i)).toBeDefined();
  });

  it('renders official listing performance for listed IPO with positive listing gain', () => {
    const tonboGmp: GmpEntry = {
      name: 'Tonbo Imaging India',
      cleanName: 'tonboimaging',
      gmp: 452,
      pct: 64.57,
      price: 700,
      lotSize: 21,
      source: 'InvestorGain',
      isListed: true,
      listingPrice: 1160,
      listingGainPct: 65.7,
      listingGainPerShare: 460,
      listingDate: '23-Oct',
    };

    render(<GmpMarketCard selectedIpo={sampleIpo} gmpEntry={tonboGmp} />);

    expect(screen.getByText('+65.7%')).toBeDefined();
    expect(screen.getByText('₹1160')).toBeDefined();
    expect(screen.getByText('₹700')).toBeDefined();
    expect(screen.getByText('+₹460')).toBeDefined();
    expect(screen.getByText('+₹9,660')).toBeDefined(); // 21 * 460
  });

  it('renders neutral message when GMP is not quoted yet', () => {
    render(<GmpMarketCard selectedIpo={sampleIpo} gmpEntry={null} />);

    expect(
      screen.getByText(/Grey Market Premium \(GMP\) is not actively quoted yet/i)
    ).toBeDefined();
  });
});
