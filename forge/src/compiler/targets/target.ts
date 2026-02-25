export type TargetContext = {
  specHash: string;
  schemaVersion: string;
  buildTime: string;
};

export type GeneratedArtifact = {
  /** relative path within the target root */
  relPath: string;
  content: string;
};

export interface CompilerTarget {
  readonly id: string;

  /**
   * Generate artifacts for this target.
   * Must be deterministic for a given spec + context.
   */
  generate(input: { spec: any; appName: string; ctx: TargetContext }): Promise<GeneratedArtifact[]> | GeneratedArtifact[];

  /** Root folder name inside output dir (e.g. "web", "backend"). */
  rootDirName(): string;
}
