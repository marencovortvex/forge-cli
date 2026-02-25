import type { Advisory, EnforcementMode } from '../types/governance.js';

export type GovernanceConfig = {
  enforcement_mode: EnforcementMode;
};

export type PolicyEvaluation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  advisories: Advisory[];
  deployBlockers: string[];
  enforcementMode: EnforcementMode;
};

export interface PolicyRuleset {
  /** Stable identifier for provenance (e.g. "default"). */
  readonly id: string;

  evaluate(input: {
    spec: any;
    governance: GovernanceConfig;
    advisories: Advisory[];
  }): PolicyEvaluation;
}
