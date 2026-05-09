// packages/engine/src/types.ts
export interface ModuleMetadata {
  id: string;
  name: string;
  version: string;
  dependencies: string[];
  entrypoint: string;
  locked: boolean;
  testsPassed: boolean;
  lastTestedAt: Date;
  mutationScore: number; // target > 90%
}

export interface TestResult {
  moduleId: string;
  passed: boolean;
  failedTests: Array<{ name: string; error: string }>;
  durationMs: number;
  mutantsKilled: number;
  mutantsTotal: number;
}
