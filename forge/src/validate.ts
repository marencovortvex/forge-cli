import { validateSpecPipeline, type ValidationResult } from './governance/pipeline.js';

export type { ValidationResult };

export async function validateSpecFile(specPath: string): Promise<ValidationResult> {
  return validateSpecPipeline(specPath);
}
