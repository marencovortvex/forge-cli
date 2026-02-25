import type { Advisory } from '../../types/governance.js';

// Seeded advisories are explicit governance signals for MVP.
export function seededAdvisories(): Advisory[] {
  return [
    {
      id: 'GHSA-9g9p-9gw9-jx7f',
      package: 'next',
      severity: 'high',
      title: 'Next.js vulnerable to DoS via Image Optimizer remotePatterns',
      range_affected: '>=10.0.0 <15.5.10',
      recommendation: 'Upgrade next to >= 15.5.10',
      source: 'seeded',
      url: 'https://github.com/advisories/GHSA-9g9p-9gw9-jx7f'
    }
  ];
}
