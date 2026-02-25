import chalk from 'chalk';

export type GovernanceSummaryInput = {
  headerApp?: string;
  specPath: string;
  outputDir: string;
  specHash?: string;
  schemaVersion?: string;
  enforcementMode?: string;
  warnings: string[];
  advisories: Array<{ package?: string; id?: string; severity?: string }>;
  deployBlockers: string[];
  reportPath?: string;
  provenancePath?: string;
  showNextLine?: boolean;
};

export function printGovernanceSummary(input: GovernanceSummaryInput) {
  console.log(chalk.bold('\nFORGE GOVERNANCE SUMMARY'));
  console.log('────────────────────────────────────────');
  if (input.headerApp) console.log(`APP: ${chalk.cyan(input.headerApp)}`);
  console.log(`SPEC: ${chalk.cyan(input.specPath)}`);
  if (input.specHash) console.log(`SPEC_HASH: ${chalk.cyan(input.specHash.slice(0, 8) + '…' + input.specHash.slice(-8))}`);
  if (input.schemaVersion) console.log(`SCHEMA_VERSION: ${chalk.cyan(input.schemaVersion)}`);
  console.log(`OUTPUT: ${chalk.cyan(input.outputDir || '(none)')}`);

  console.log(`POLICY GATE: ${chalk.green('PASS')} ${chalk.dim('(compile)')}`);
  console.log(`ENFORCEMENT MODE: ${chalk.cyan(input.enforcementMode || 'standard')}`);

  const advisoryLines = input.advisories.slice(0, 3).map((a) => {
    const pkg = a?.package || 'unknown';
    const id = a?.id || 'advisory';
    const sev = a?.severity || 'unknown';
    return `Security advisory: ${pkg} (${id}) severity=${sev} (see report)`;
  });
  const extraCount = input.advisories.length > 3 ? input.advisories.length - 3 : 0;

  const warningsAll = [...(input.warnings || []), ...advisoryLines, ...(extraCount ? [`+${extraCount} more advisories (see report)`] : [])];

  const warnCount = warningsAll.length;
  if (warnCount) {
    console.log(chalk.yellow(`WARNINGS (${warnCount}):`));
    for (const w of warningsAll) console.log(chalk.yellow(`- ${w}`));
  } else {
    console.log(chalk.green('WARNINGS (0):'));
    console.log(chalk.green('- none'));
  }

  const blockerCount = input.deployBlockers.length;
  console.log(chalk.red(`DEPLOY BLOCKERS (${blockerCount}):`));
  if (blockerCount) {
    for (const b of input.deployBlockers) console.log(chalk.red(`- ${b}`));
  } else {
    console.log(chalk.red('- none'));
  }

  if (input.reportPath) console.log(`REPORT: ${chalk.cyan(input.reportPath)}`);
  if (input.provenancePath) console.log(`PROVENANCE: ${chalk.cyan(input.provenancePath)}`);
  console.log('────────────────────────────────────────');
  if (input.showNextLine) console.log(chalk.dim('Next: forge deploy (blocked if policy gate fails)'));
}
