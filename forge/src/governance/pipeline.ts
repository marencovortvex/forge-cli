import path from 'node:path';

import { loadSpecFile } from '../spec/load.js';
import { sha256Hex } from '../spec/hash.js';
import { validateAgainstSchema } from '../spec/schema.js';

import type { AdvisoryProvider } from '../policy/advisories/provider.js';
import type { PolicyRuleset } from '../policy/ruleset.js';

import { generateTargets, writeForgeGeneratedManifest } from '../compiler/generate.js';
import { defaultAdvisoryProviders, defaultRuleset, defaultTargets, advisoryProviderRegistry, targetRegistry } from '../registry/defaults.js';
import { makePolicyReport } from './policyReport.js';
import { writeBuildProvenance, writePolicyReport } from './artifacts.js';

export type ValidationResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
};

export type CompilePipelineResult = ValidationResult & {
  outputDir?: string;
  specHash?: string;
  schemaVersion?: string;
  policyReportPath?: string;
  provenancePath?: string;
};

async function runAdvisoryProviders(spec: any, providers: AdvisoryProvider[]) {
  const ctx = {
    environment: {
      nodeVersion: process.version,
      platform: process.platform
    }
  };

  const all = [] as any[];
  for (const p of providers) {
    const res = await p.getAdvisories({ spec, ctx });
    all.push(...(res || []));
  }
  return all;
}

export async function validateSpecPipeline(
  specPath: string,
  deps?: {
    advisoryProviders?: AdvisoryProvider[];
    ruleset?: PolicyRuleset;
  }
): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { spec } = await loadSpecFile(specPath);

  const schema = await validateAgainstSchema(spec);
  if (!schema.ok) {
    return { ok: false, errors: schema.errors, warnings };
  }

  // Selection validation (config-driven) — defaults are implicit.
  const requestedProviderIds = Array.isArray(spec?.governance?.advisory_providers)
    ? (spec.governance.advisory_providers as any[]).map((x) => String(x))
    : ['seeded'];

  const requestedTargetIds = Array.isArray(spec?.governance?.targets)
    ? (spec.governance.targets as any[]).map((x) => String(x))
    : ['backend-nestjs', 'web-nextjs'];

  const providerMap = advisoryProviderRegistry();
  const targetMap = targetRegistry();

  for (const id of requestedProviderIds) {
    if (!providerMap.has(id)) {
      return { ok: false, errors: [`unknown provider: ${id}`], warnings: [] };
    }
  }
  for (const id of requestedTargetIds) {
    if (!targetMap.has(id)) {
      return { ok: false, errors: [`unknown target: ${id}`], warnings: [] };
    }
  }

  const advisoryProviders = deps?.advisoryProviders || defaultAdvisoryProviders();
  const ruleset = deps?.ruleset || defaultRuleset();

  const advisories = await runAdvisoryProviders(spec, advisoryProviders);
  const pe = ruleset.evaluate({
    spec,
    governance: { enforcement_mode: String(spec?.governance?.enforcement_mode || 'standard') as any },
    advisories
  });

  warnings.push(...pe.warnings);
  errors.push(...pe.errors);

  return { ok: errors.length === 0, errors, warnings };
}

export async function compilePipeline(input: {
  specPath: string;
  outBaseDir: string;
  clean: boolean;
  advisoryProviders?: AdvisoryProvider[];
  ruleset?: PolicyRuleset;
  targets?: any[];
}): Promise<CompilePipelineResult> {
  const errors: string[] = [];

  const loaded = await loadSpecFile(input.specPath);
  const spec = loaded.spec;

  // 1) schema
  const schemaRes = await validateAgainstSchema(spec);
  if (!schemaRes.ok) {
    return { ok: false, errors: schemaRes.errors, warnings: [] };
  }

  // 2) compute identity
  const specHash = sha256Hex(loaded.raw);
  const schemaVersion = String(spec?.spec_version || 'v0');
  const appName = String(spec?.app?.name || 'App');
  const appVersion = String(spec?.app?.version || '0.0.0');
  const buildTime = process.env.FORGE_BUILD_TIME || new Date().toISOString();

  // 3) advisory providers + policy ruleset
  // 3a) select providers/targets based on spec (or defaults)
  const requestedProviderIds = Array.isArray(spec?.governance?.advisory_providers)
    ? (spec.governance.advisory_providers as any[]).map((x) => String(x))
    : ['seeded'];

  const requestedTargetIds = Array.isArray(spec?.governance?.targets)
    ? (spec.governance.targets as any[]).map((x) => String(x))
    : ['backend-nestjs', 'web-nextjs'];

  const providerMap = advisoryProviderRegistry();
  const targetMap = targetRegistry();

  const selectedProviders: AdvisoryProvider[] = [];
  for (const id of requestedProviderIds) {
    const p = providerMap.get(id);
    if (!p) {
      return { ok: false, errors: [`unknown provider: ${id}`], warnings: [] };
    }
    selectedProviders.push(p);
  }

  const selectedTargets = [] as any[];
  for (const id of requestedTargetIds) {
    const t = targetMap.get(id);
    if (!t) {
      return { ok: false, errors: [`unknown target: ${id}`], warnings: [] };
    }
    selectedTargets.push(t);
  }

  const advisoryProviders = input.advisoryProviders || selectedProviders || defaultAdvisoryProviders();
  const ruleset = input.ruleset || defaultRuleset();
  const advisories = await runAdvisoryProviders(spec, advisoryProviders);

  const pe = ruleset.evaluate({
    spec,
    governance: { enforcement_mode: String(spec?.governance?.enforcement_mode || 'standard') as any },
    advisories
  });

  if (!pe.ok) {
    return { ok: false, errors: pe.errors, warnings: pe.warnings };
  }

  // 4) generate targets (via target plugins)
  const targets = input.targets || selectedTargets || defaultTargets();
  const { outDir } = await generateTargets({
    outBaseDir: input.outBaseDir,
    appName,
    spec,
    targets,
    ctx: { specHash, schemaVersion, buildTime },
    clean: input.clean
  });

  await writeForgeGeneratedManifest({
    outDir,
    appName,
    specPath: input.specPath,
    specHash,
    schemaVersion,
    buildTime
  });

  // 5) governance artifacts
  // derive PII fields + logging policy present
  const piiFields: string[] = [];
  const entities = spec?.domain?.entities || {};
  for (const [entityName, entityDef] of Object.entries<any>(entities)) {
    const fields = (entityDef as any)?.fields || {};
    for (const [fieldName, fieldDef] of Object.entries<any>(fields)) {
      if ((fieldDef as any)?.pii === true) piiFields.push(`${entityName}.${fieldName}`);
    }
  }
  const policies = spec?.security?.policies || [];
  const hasNoPiiInLogsPolicy = policies.some((p: any) => p?.name === 'no_pii_in_logs' && p?.kind === 'logging');

  const report = makePolicyReport({
    specHash,
    schemaVersion,
    appName,
    appVersion,
    enforcementMode: pe.enforcementMode,
    piiFields,
    hasNoPiiInLogsPolicy,
    advisories: pe.advisories,
    warnings: pe.warnings,
    deployBlockers: pe.deployBlockers,
    timestamp: buildTime
  });

  const policyReportPath = await writePolicyReport(outDir, report);
  const provenancePath = await writeBuildProvenance(outDir, {
    forgeVersion: '0.1.3',
    specPath: input.specPath,
    specHash,
    schemaVersion,
    enforcementMode: pe.enforcementMode,
    buildTime
  });

  return {
    ok: errors.length === 0,
    errors,
    warnings: pe.warnings,
    outputDir: outDir,
    specHash,
    schemaVersion,
    policyReportPath,
    provenancePath
  };
}

export function outputDirForSpec(input: { outBaseDir: string; spec: any }) {
  const appName = String(input.spec?.app?.name || 'App');
  return path.resolve(process.cwd(), input.outBaseDir, appName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
}
