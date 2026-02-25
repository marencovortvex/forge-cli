export type Advisory = {
  id: string;
  package: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  title: string;
  range_affected: string;
  recommendation: string;
  source: string; // seeded | npm_audit | etc
  url?: string;
};

export type EnforcementMode = 'standard' | 'strict';
