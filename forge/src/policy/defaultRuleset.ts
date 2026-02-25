import type { Advisory } from '../types/governance.js';
import type { PolicyRuleset, PolicyEvaluation } from './ruleset.js';

export class DefaultRuleset implements PolicyRuleset {
  readonly id = 'default';

  evaluate(input: { spec: any; governance: { enforcement_mode: any }; advisories: Advisory[] }): PolicyEvaluation {
    const { spec, advisories } = input;

    const errors: string[] = [];
    const warnings: string[] = [];

    const enforcementMode = String(input.governance?.enforcement_mode || 'standard') as any;

    // Deterministic spec integrity rules
    // Rule: If any field is pii:true, must include security policy no_pii_in_logs.
    const entities = spec?.domain?.entities || {};
    let hasPII = false;
    for (const [entityName, entityDef] of Object.entries<any>(entities)) {
      const fields = (entityDef as any)?.fields || {};
      for (const [fieldName, fieldDef] of Object.entries<any>(fields)) {
        if ((fieldDef as any)?.pii === true) {
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

    // Enforcement rules (minimal)
    const deployBlockers: string[] = [];
    if (enforcementMode === 'strict') {
      for (const adv of advisories) {
        const sev = String((adv as any)?.severity || '').toLowerCase();
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
}
