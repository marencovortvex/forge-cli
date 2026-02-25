import fs from 'node:fs/promises';
import path from 'node:path';

import { validateSpecPipeline, compilePipeline, type ValidationResult } from './governance/pipeline.js';

export type VerifyResult = ValidationResult & {
  outputDir?: string;
  policyReportPath?: string;
  provenancePath?: string;
};

async function fileExists(p: string) {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

export async function verifyFromSpecFile(specPath: string, outBaseDir: string): Promise<VerifyResult> {
  const vr = await validateSpecPipeline(specPath);
  if (!vr.ok) return vr;

  const cr = await compilePipeline({ specPath, outBaseDir, clean: true });
  if (!cr.ok) return cr;

  const outDir = cr.outputDir!;
  const policyReportPath = path.join(outDir, 'POLICY_REPORT.json');
  const provenancePath = path.join(outDir, 'BUILD_PROVENANCE.json');

  const errors: string[] = [];
  if (!(await fileExists(policyReportPath))) errors.push(`Missing governance artifact: ${policyReportPath}`);
  if (!(await fileExists(provenancePath))) errors.push(`Missing governance artifact: ${provenancePath}`);

  if (errors.length === 0) {
    try {
      const reportRaw = await fs.readFile(policyReportPath, 'utf8');
      const report = JSON.parse(reportRaw);
      const policyGate = report?.policy_gate?.compile;
      const blockers = Array.isArray(report?.deploy_blockers) ? report.deploy_blockers : [];

      if (policyGate && policyGate !== 'PASS') {
        errors.push(`Policy gate compile status is not PASS: ${String(policyGate)}`);
      }
      if (blockers.length > 0) {
        errors.push(`Deploy blockers present (${blockers.length}). Shipping must be blocked.`);
      }
    } catch (e: any) {
      errors.push(`Failed to parse POLICY_REPORT.json: ${e?.message || String(e)}`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings: cr.warnings,
    outputDir: outDir,
    policyReportPath,
    provenancePath
  };
}
