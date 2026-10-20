import { RegistrarAdapter } from './types';
import { RegistrarCode } from '../../types/ipo';
import { LinkIntimeAdapter } from './linkIntimeAdapter';
import { AlankitAdapter } from './alankitAdapter';
import { ManualCheckAdapter } from './manualAdapters';

const linkIntimeAdapter = new LinkIntimeAdapter();
const alankitAdapter = new AlankitAdapter();

export function getRegistrarAdapter(code: RegistrarCode): RegistrarAdapter {
  switch (code) {
    case 'LINKINTIME':
      return linkIntimeAdapter;
    case 'ALANKIT':
      return alankitAdapter;
    case 'KFINTECH':
      return new ManualCheckAdapter('KFINTECH', 'Image CAPTCHA challenge');
    case 'BIGSHARE':
      return new ManualCheckAdapter('BIGSHARE', 'Session CAPTCHA verification');
    case 'BSE':
      return new ManualCheckAdapter('BSE', 'Akamai Bot Protection / WAF');
    case 'NSE':
      return new ManualCheckAdapter('NSE', 'reCAPTCHA v3 & Investor Login');
    case 'SKYLINE':
      return new ManualCheckAdapter('SKYLINE', 'Interactive CSRF form');
    case 'PURVA':
      return new ManualCheckAdapter('PURVA', 'Interactive query form');
    default:
      return new ManualCheckAdapter('OTHER', 'Manual verification required');
  }
}
