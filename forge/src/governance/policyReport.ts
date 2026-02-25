import type { Advisory, EnforcementMode } from '../types/governance.js';

export type PolicyGateStatus = 'PASS' | 'FAIL';

export type PolicyReport = {
  spec_hash: string;
  schema_version: string;
  app: { name: string; version: string };
  timestamp: string;
  policy_gate: {
    compile: PolicyGateStatus;
  };
  enforcement_mode: EnforcementMode;
  policies: {
    pii_detected: boolean;
    pii_fields: string[];
    pii_log_redaction_policy_present: boolean;
  };
  advisories: Advisory[];
  warnings: string[];
  deploy_blockers: string[];
};

export function makePolicyReport(input: {
  specHash: string;
  schemaVersion: string;
  appName: string;
  appVersion: string;
  enforcementMode?: EnforcementMode;
  piiFields: string[];
  hasNoPiiInLogsPolicy: boolean;
  advisories?: Advisory[];
  warnings: string[];
  deployBlockers?: string[];
  timestamp: string;
}): PolicyReport {
  return {
    spec_hash: input.specHash,
    schema_version: input.schemaVersion,
    app: { name: input.appName, version: input.appVersion },
    timestamp: input.timestamp,
    policy_gate: { compile: 'PASS' },
    enforcement_mode: input.enforcementMode || 'standard',
    policies: {
      pii_detected: input.piiFields.length > 0,
      pii_fields: input.piiFields,
      pii_log_redaction_policy_present: input.hasNoPiiInLogsPolicy
    },
    advisories: input.advisories || [],
    warnings: input.warnings,
    deploy_blockers: input.deployBlockers || []
  };
}
