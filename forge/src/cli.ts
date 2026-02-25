#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { validateSpecFile } from './validate.js';
import { compileFromSpecFile } from './compile.js';
import { verifyFromSpecFile } from './verify.js';

const program = new Command();
program
  .name('forge')
  .description('FORGE — AI-native system compiler (MVP CLI)')
  .version('0.1.1');

program
  .command('validate')
  .description('Validate a SPEC (YAML) against schema + policy gate')
  .argument('<specPath>', 'Path to spec.yaml')
  .action(async (specPath) => {
    try {
      const res = await validateSpecFile(specPath);
      if (!res.ok) {
        console.error(chalk.red('✗ SPEC invalid'));
        for (const e of res.errors) console.error(chalk.red(`- ${e}`));
        process.exitCode = 1;
        return;
      }
      console.log(chalk.green('✓ SPEC valid'));
      for (const w of res.warnings) console.warn(chalk.yellow(`- ${w}`));
    } catch (err: any) {
      console.error(chalk.red('✗ validate failed'));
      console.error(err?.stack || err?.message || String(err));
      process.exitCode = 1;
    }
  });

program
  .command('compile')
  .description('Compile a valid SPEC into a generated system in output/')
  .argument('<specPath>', 'Path to spec.yaml')
  .option('-o, --outDir <dir>', 'Output base directory', '../output')
  .option('--clean', 'Remove output directory if it exists (idempotent compile)', false)
  .action(async (specPath, opts) => {
    try {
      const res = await compileFromSpecFile(specPath, opts.outDir, { clean: Boolean(opts.clean) });
      if (!res.ok) {
        console.error(chalk.red('✗ compile failed'));
        for (const e of res.errors) console.error(chalk.red(`- ${e}`));
        process.exitCode = 1;
        return;
      }
      console.log(chalk.green('✓ compile ok'));

      // Governance summary (terminal-facing proof)
      console.log(chalk.bold('\nFORGE GOVERNANCE SUMMARY'));
      console.log('────────────────────────────────────────');
      console.log(`APP: ${chalk.cyan(res.outputDir?.split('/').pop() || 'unknown')}`);
      console.log(`SPEC: ${chalk.cyan(specPath)}`);
      if (res.specHash) console.log(`SPEC_HASH: ${chalk.cyan(res.specHash.slice(0, 8) + '…' + res.specHash.slice(-8))}`);
      if (res.schemaVersion) console.log(`SCHEMA_VERSION: ${chalk.cyan(res.schemaVersion)}`);
      console.log(`OUTPUT: ${chalk.cyan(res.outputDir || '(none)')}`);
      // Pull governance artifacts from POLICY_REPORT.json for terminal summary.
      let advisories: Array<any> = [];
      let enforcementMode: string | null = null;
      let deployBlockers: string[] = [];
      if (res.policyReportPath) {
        try {
          const fs = await import('node:fs/promises');
          const reportRaw = await fs.readFile(res.policyReportPath, 'utf8');
          const report = JSON.parse(reportRaw);
          advisories = Array.isArray(report?.advisories) ? report.advisories : [];
          enforcementMode = report?.enforcement_mode || null;
          deployBlockers = Array.isArray(report?.deploy_blockers) ? report.deploy_blockers : [];
        } catch {
          // ignore: summary still works
        }
      }

      console.log(`POLICY GATE: ${chalk.green('PASS')} ${chalk.dim('(compile)')}`);
      console.log(`ENFORCEMENT MODE: ${chalk.cyan(enforcementMode || 'standard')}`);

      const advisoryLines = advisories.slice(0, 3).map((a: any) => {
        const pkg = a?.package || 'unknown';
        const id = a?.id || 'advisory';
        const sev = a?.severity || 'unknown';
        return `Security advisory: ${pkg} (${id}) severity=${sev} (see report)`;
      });
      const extraCount = advisories.length > 3 ? advisories.length - 3 : 0;

      const warningsAll = [...(res.warnings || []), ...advisoryLines, ...(extraCount ? [`+${extraCount} more advisories (see report)`] : [])];
      const warnCount = warningsAll.length;
      if (warnCount) {
        console.log(chalk.yellow(`WARNINGS (${warnCount}):`));
        for (const w of warningsAll) console.log(chalk.yellow(`- ${w}`));
      } else {
        console.log(chalk.green('WARNINGS (0):'));
        console.log(chalk.green('- none'));
      }

      const blockerCount = deployBlockers.length;
      console.log(chalk.red(`DEPLOY BLOCKERS (${blockerCount}):`));
      if (blockerCount) {
        for (const b of deployBlockers) console.log(chalk.red(`- ${b}`));
      } else {
        console.log(chalk.red('- none'));
      }

      if (res.policyReportPath) console.log(`REPORT: ${chalk.cyan(res.policyReportPath)}`);
      if (res.provenancePath) console.log(`PROVENANCE: ${chalk.cyan(res.provenancePath)}`);
      console.log('────────────────────────────────────────');
      console.log(chalk.dim('Next: forge deploy (blocked if policy gate fails)'));
    } catch (err: any) {
      console.error(chalk.red('✗ compile crashed'));
      console.error(err?.stack || err?.message || String(err));
      process.exitCode = 1;
    }
  });

program
  .command('verify')
  .description('Validate + compile --clean + enforce governance contract (policy gate + blockers)')
  .argument('<specPath>', 'Path to spec.yaml')
  .option('-o, --outDir <dir>', 'Output base directory', '../output')
  .action(async (specPath, opts) => {
    try {
      const res = await verifyFromSpecFile(specPath, opts.outDir);
      if (!res.ok) {
        console.error(chalk.red('✗ verify failed'));
        for (const e of res.errors) console.error(chalk.red(`- ${e}`));
        process.exitCode = 1;
        return;
      }

      console.log(chalk.green('✓ verify ok'));

      // Print the same terminal-facing governance summary style as compile.
      console.log(chalk.bold('\nFORGE GOVERNANCE SUMMARY'));
      console.log('────────────────────────────────────────');
      console.log(`SPEC: ${chalk.cyan(specPath)}`);
      console.log(`OUTPUT: ${chalk.cyan(res.outputDir || '(none)')}`);

      let advisories: Array<any> = [];
      let enforcementMode: string | null = null;
      let deployBlockers: string[] = [];
      let policyGateCompile: string | null = null;

      if (res.policyReportPath) {
        try {
          const fs = await import('node:fs/promises');
          const reportRaw = await fs.readFile(res.policyReportPath, 'utf8');
          const report = JSON.parse(reportRaw);
          advisories = Array.isArray(report?.advisories) ? report.advisories : [];
          enforcementMode = report?.enforcement_mode || null;
          deployBlockers = Array.isArray(report?.deploy_blockers) ? report.deploy_blockers : [];
          policyGateCompile = report?.policy_gate?.compile || null;

          const specHash = report?.spec_hash;
          const schemaVersion = report?.schema_version;
          const appName = report?.app?.name;
          const appVersion = report?.app?.version;

          if (appName) console.log(`APP: ${chalk.cyan(appName)}${appVersion ? chalk.dim(` (${appVersion})`) : ''}`);
          if (specHash) console.log(`SPEC_HASH: ${chalk.cyan(String(specHash).slice(0, 8) + '…' + String(specHash).slice(-8))}`);
          if (schemaVersion) console.log(`SCHEMA_VERSION: ${chalk.cyan(schemaVersion)}`);
        } catch {}
      }

      console.log(`POLICY GATE: ${chalk.green(policyGateCompile || 'PASS')} ${chalk.dim('(compile)')}`);
      console.log(`ENFORCEMENT MODE: ${chalk.cyan(enforcementMode || 'standard')}`);

      const advisoryLines = advisories.slice(0, 3).map((a: any) => {
        const pkg = a?.package || 'unknown';
        const id = a?.id || 'advisory';
        const sev = a?.severity || 'unknown';
        return `Security advisory: ${pkg} (${id}) severity=${sev} (see report)`;
      });
      const extraCount = advisories.length > 3 ? advisories.length - 3 : 0;
      const warningsAll = [...(res.warnings || []), ...advisoryLines, ...(extraCount ? [`+${extraCount} more advisories (see report)`] : [])];

      const warnCount = warningsAll.length;
      if (warnCount) {
        console.log(chalk.yellow(`WARNINGS (${warnCount}):`));
        for (const w of warningsAll) console.log(chalk.yellow(`- ${w}`));
      } else {
        console.log(chalk.green('WARNINGS (0):'));
        console.log(chalk.green('- none'));
      }

      const blockerCount = deployBlockers.length;
      console.log(chalk.red(`DEPLOY BLOCKERS (${blockerCount}):`));
      if (blockerCount) {
        for (const b of deployBlockers) console.log(chalk.red(`- ${b}`));
      } else {
        console.log(chalk.red('- none'));
      }

      if (res.policyReportPath) console.log(`REPORT: ${chalk.cyan(res.policyReportPath)}`);
      if (res.provenancePath) console.log(`PROVENANCE: ${chalk.cyan(res.provenancePath)}`);
      console.log('────────────────────────────────────────');
    } catch (err: any) {
      console.error(chalk.red('✗ verify crashed'));
      console.error(err?.stack || err?.message || String(err));
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
