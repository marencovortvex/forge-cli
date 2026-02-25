import fs from 'node:fs/promises';
import path from 'node:path';
import type { PolicyReport } from './policyReport.js';

async function writeFile(filePath: string, content: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

export async function writePolicyReport(outDir: string, report: PolicyReport) {
  const p = path.join(outDir, 'POLICY_REPORT.json');
  await writeFile(p, JSON.stringify(report, null, 2) + '\n');
  return p;
}

export async function writeBuildProvenance(outDir: string, input: {
  forgeVersion: string;
  specPath: string;
  specHash: string;
  schemaVersion: string;
  enforcementMode: string;
  buildTime: string;
}) {
  const provenance = {
    forge_version: input.forgeVersion,
    spec_path: input.specPath,
    spec_hash: input.specHash,
    schema_version: input.schemaVersion,
    enforcement_mode: input.enforcementMode,
    output_dir: outDir,
    policy_report: 'POLICY_REPORT.json',
    generated_at: input.buildTime
  };

  const p = path.join(outDir, 'BUILD_PROVENANCE.json');
  await writeFile(p, JSON.stringify(provenance, null, 2) + '\n');
  return p;
}
