import { compilePipeline, type CompilePipelineResult, type ValidationResult } from './governance/pipeline.js';

export type CompileResult = ValidationResult & {
  outputDir?: string;
  specHash?: string;
  schemaVersion?: string;
  policyReportPath?: string;
  provenancePath?: string;
};

export async function compileFromSpecFile(
  specPath: string,
  outBaseDir: string,
  opts: { clean: boolean } = { clean: false }
): Promise<CompilePipelineResult> {
  return compilePipeline({ specPath, outBaseDir, clean: opts.clean });
}
