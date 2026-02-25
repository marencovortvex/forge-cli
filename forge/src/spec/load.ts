import fs from 'node:fs/promises';
import YAML from 'yaml';

export type LoadedSpec = {
  raw: string;
  spec: any;
};

export async function loadSpecFile(specPath: string): Promise<LoadedSpec> {
  const raw = await fs.readFile(specPath, 'utf8');
  const spec = YAML.parse(raw);
  return { raw, spec };
}
