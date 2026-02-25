import fs from 'node:fs/promises';
import path from 'node:path';
import YAML from 'yaml';
import { validateSpecFile, type ValidationResult } from './validate.js';
import { compileFromSpecFile } from './compile.js';

export type VerifyResult = ValidationResult & {
  outputDir?: string;
  policyReportPath?: string;
  provenancePath?: string;
};

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function fileExists(p: string) {
  try {
    const st = await fs.stat(p);
    return st.isFile();
  } catch {
    return false;
  }
}

export async function verifyFromSpecFile(specPath: string, outBaseDir: string): Promise<VerifyResult> {
  const vr = await validateSpecFile(specPath);
  if (!vr.ok) return vr;

  // Compile idempotently.
  const cr = await compileFromSpecFile(specPath, outBaseDir, { clean: true });
  if (!cr.ok) return cr;

  const raw = await fs.readFile(specPath, 'utf8');
  const spec: any = YAML.parse(raw);
  const appName = String(spec?.app?.name || 'App');
  const outDir = path.resolve(process.cwd(), outBaseDir, slugify(appName));

  const policyReportPath = path.join(outDir, 'POLICY_REPORT.json');
  const provenancePath = path.join(outDir, 'BUILD_PROVENANCE.json');

  const errors: string[] = [];
  if (!(await fileExists(policyReportPath))) errors.push(`Missing governance artifact: ${policyReportPath}`);
  if (!(await fileExists(provenancePath))) errors.push(`Missing governance artifact: ${provenancePath}`);

  // Governance enforcement checks
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
    warnings: vr.warnings,
    outputDir: outDir,
    policyReportPath,
    provenancePath
  };
}
