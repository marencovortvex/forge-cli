import { Command } from 'commander';
import chalk from 'chalk';

import { validateSpecFile } from '../validate.js';
import { compileFromSpecFile } from '../compile.js';
import { verifyFromSpecFile } from '../verify.js';
import { printGovernanceSummary } from '../governance/summary.js';

async function readPolicyReport(p: string) {
  try {
    const fs = await import('node:fs/promises');
    const reportRaw = await fs.readFile(p, 'utf8');
    return JSON.parse(reportRaw);
  } catch {
    return null;
  }
}

export function buildProgram() {
  const program = new Command();
  program
    .name('forge')
    .description('FORGE — AI-native system compiler (MVP CLI)')
    .version('0.1.3');

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

        const report = res.policyReportPath ? await readPolicyReport(res.policyReportPath) : null;

        printGovernanceSummary({
          headerApp: res.outputDir?.split('/').pop() || 'unknown',
          specPath,
          outputDir: res.outputDir || '(none)',
          specHash: res.specHash,
          schemaVersion: res.schemaVersion,
          enforcementMode: report?.enforcement_mode || 'standard',
          warnings: res.warnings || [],
          advisories: Array.isArray(report?.advisories) ? report.advisories : [],
          deployBlockers: Array.isArray(report?.deploy_blockers) ? report.deploy_blockers : [],
          reportPath: res.policyReportPath,
          provenancePath: res.provenancePath,
          showNextLine: true
        });
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

        const report = res.policyReportPath ? await readPolicyReport(res.policyReportPath) : null;

        printGovernanceSummary({
          specPath,
          outputDir: res.outputDir || '(none)',
          headerApp: report?.app?.name ? `${report.app.name}${report.app?.version ? ` (${report.app.version})` : ''}` : undefined,
          specHash: report?.spec_hash,
          schemaVersion: report?.schema_version,
          enforcementMode: report?.enforcement_mode || 'standard',
          warnings: Array.isArray(report?.warnings) ? report.warnings : [],
          advisories: Array.isArray(report?.advisories) ? report.advisories : [],
          deployBlockers: Array.isArray(report?.deploy_blockers) ? report.deploy_blockers : [],
          reportPath: res.policyReportPath,
          provenancePath: res.provenancePath,
          showNextLine: false
        });
      } catch (err: any) {
        console.error(chalk.red('✗ verify crashed'));
        console.error(err?.stack || err?.message || String(err));
        process.exitCode = 1;
      }
    });

  return program;
}
