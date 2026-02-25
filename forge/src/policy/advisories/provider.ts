import type { Advisory } from '../../types/governance.js';

export type AdvisoryProviderContext = {
  environment?: {
    nodeVersion?: string;
    platform?: string;
  };
};

export interface AdvisoryProvider {
  /** Stable identifier for provenance (e.g. "seeded", "npm_audit"). */
  readonly id: string;

  /**
   * Return advisories for the given spec + environment.
   * Providers must be pure/deterministic for a given input.
   */
  getAdvisories(input: { spec: any; ctx: AdvisoryProviderContext }): Promise<Advisory[]> | Advisory[];
}
