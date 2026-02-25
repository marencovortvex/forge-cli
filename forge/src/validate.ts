import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

function rel(p: string) {
  return path.relative(process.cwd(), p);
}

export async function validateSpecFile(specPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const raw = await fs.readFile(specPath, 'utf8');
  const spec = YAML.parse(raw);
  const specAny: any = spec;

  // 1) JSON Schema validation
  const schemaPath = path.resolve(__dirname, '../schema/spec.schema.json');
  const schemaRaw = await fs.readFile(schemaPath, 'utf8');
  const schema = JSON.parse(schemaRaw);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const okSchema = validate(specAny);
  if (!okSchema) {
    for (const err of validate.errors || []) {
      errors.push(`${err.instancePath || '/'} ${err.message || 'invalid'}`);
    }
    return { ok: false, errors, warnings };
  }

  // 2) Policy gate (deterministic MVP rules)
  // Rule: If any field is pii:true, must include security policy no_pii_in_logs.
  const entities = (specAny as any)?.domain?.entities || {};
  let hasPII = false;
  for (const [entityName, entityDef] of Object.entries<any>(entities)) {
    const fields = entityDef?.fields || {};
    for (const [fieldName, fieldDef] of Object.entries<any>(fields)) {
      if (fieldDef?.pii === true) {
        hasPII = true;
        // Basic warning: encourage retention later (not in v0 schema)
        warnings.push(`PII field detected: ${entityName}.${fieldName} (policy gate will enforce log redaction)`);
      }
    }
  }

  if (hasPII) {
    const policies = (specAny as any)?.security?.policies || [];
    const hasRedaction = policies.some((p: any) => p?.name === 'no_pii_in_logs' && p?.kind === 'logging');
    if (!hasRedaction) {
      errors.push('Policy gate: pii:true fields require security.policies[] to include {name: no_pii_in_logs, kind: logging}.');
    }
  }

  // Rule: flow actor role must exist
  const roles = new Set<string>(((specAny as any)?.roles || []).map((r: any) => String(r)));
  for (const f of (specAny as any)?.flows || []) {
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

  return { ok: errors.length === 0, errors, warnings };
}
