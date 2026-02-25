import fs from 'node:fs/promises';
import path from 'node:path';
import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';

export type SchemaValidation = { ok: true } | { ok: false; errors: string[] };

export async function validateAgainstSchema(spec: any): Promise<SchemaValidation> {
  // dist/spec -> ../../schema
  const schemaPath = path.resolve(__dirname, '../../schema/spec.schema.json');
  const schemaRaw = await fs.readFile(schemaPath, 'utf8');
  const schema = JSON.parse(schemaRaw);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const okSchema = validate(spec);
  if (okSchema) return { ok: true };

  const errors: string[] = [];
  for (const err of validate.errors || []) {
    errors.push(`${err.instancePath || '/'} ${err.message || 'invalid'}`);
  }
  return { ok: false, errors };
}
