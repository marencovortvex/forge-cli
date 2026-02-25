import type { Advisory, EnforcementMode } from '../types/governance.js';

export type PolicyEvaluation = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  advisories: Advisory[];
  deployBlockers: string[];
  enforcementMode: EnforcementMode;
};

export function evaluatePolicy(input: {
  spec: any;
  advisories: Advisory[];
}): PolicyEvaluation {
  const { spec, advisories } = input;

  const errors: string[] = [];
  const warnings: string[] = [];

  // enforcement mode (default)
  const enforcementMode = String(spec?.governance?.enforcement_mode || 'standard') as EnforcementMode;

  // Rule: If any field is pii:true, must include security policy no_pii_in_logs.
  const entities = spec?.domain?.entities || {};
  let hasPII = false;
  for (const [entityName, entityDef] of Object.entries<any>(entities)) {
    const fields = entityDef?.fields || {};
    for (const [fieldName, fieldDef] of Object.entries<any>(fields)) {
      if (fieldDef?.pii === true) {
        hasPII = true;
        warnings.push(`PII field detected: ${entityName}.${fieldName} (policy gate will enforce log redaction)`);
      }
    }
  }

  if (hasPII) {
    const policies = spec?.security?.policies || [];
    const hasRedaction = policies.some((p: any) => p?.name === 'no_pii_in_logs' && p?.kind === 'logging');
    if (!hasRedaction) {
      errors.push('Policy gate: pii:true fields require security.policies[] to include {name: no_pii_in_logs, kind: logging}.');
    }
  }

  // Rule: flow actor role must exist
  const roles = new Set<string>((spec?.roles || []).map((r: any) => String(r)));
  for (const f of spec?.flows || []) {
    if (!roles.has(String(f.actor))) {
      errors.push(`Policy gate: flow.actor '${f.actor}' must exist in roles[]`);
    }
    for (const step of f?.steps || []) {
      const entity = String(step?.entity || '');
      if (!entities[entity]) {
        errors.push(`Policy gate: flow step references unknown entity '${entity}'`);
      }
    }
  }

  // Minimal enforcement: strict mode converts high/critical advisories into deploy blockers.
  const deployBlockers: string[] = [];
  if (enforcementMode === 'strict') {
    for (const adv of advisories) {
      const sev = String(adv?.severity || '').toLowerCase();
      if (sev === 'high' || sev === 'critical') {
        deployBlockers.push(`Strict mode: security advisory blocks deploy: ${adv.package} (${adv.id}) severity=${sev}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    advisories,
    deployBlockers,
    enforcementMode
  };
}
