import { RegistrarAdapter } from './types';
import { RegistrarCode } from '../../types/ipo';
import { LinkIntimeAdapter } from './linkIntimeAdapter';
import { AlankitAdapter } from './alankitAdapter';
import { KFintechAdapter } from './kfintechAdapter';
import { BigshareAdapter } from './bigshareAdapter';
import { SkylineAdapter } from './skylineAdapter';
import { ManualCheckAdapter } from './manualAdapters';

const linkIntimeAdapter = new LinkIntimeAdapter();
const alankitAdapter = new AlankitAdapter();
const kfintechAdapter = new KFintechAdapter();
const bigshareAdapter = new BigshareAdapter();
const skylineAdapter = new SkylineAdapter();

export function getRegistrarAdapter(code: RegistrarCode): RegistrarAdapter {
  switch (code) {
    case 'LINKINTIME':
      return linkIntimeAdapter;
    case 'ALANKIT':
      return alankitAdapter;
    case 'KFINTECH':
      return kfintechAdapter;
    case 'BIGSHARE':
      return bigshareAdapter;
    case 'SKYLINE':
      return skylineAdapter;
    case 'BSE':
      return new ManualCheckAdapter('BSE', 'Akamai Bot Protection / WAF');
    case 'NSE':
      return new ManualCheckAdapter('NSE', 'reCAPTCHA v3 & Investor Login');
    case 'PURVA':
      return new ManualCheckAdapter('PURVA', 'Interactive query form');
    default:
      return new ManualCheckAdapter('OTHER', 'Manual verification required');
  }
}
