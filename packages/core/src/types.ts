export interface ModuleMetadata {
  id: string;
  name: string;
  version: string;
  dependencies: string[];
  entrypoint: string;
  locked: boolean;
  testsPassed: boolean;
  lastTestedAt: Date;
  mutationScore: number;
  testCoverage: number;
  lastMutantRun: Date | null;
}

export interface TestResult {
  moduleId: string;
  passed: boolean;
  failedTests: Array<{ name: string; error: string; stack?: string }>;
  passedTests: Array<{ name: string; duration: number }>;
  durationMs: number;
  mutantsKilled: number;
  mutantsTotal: number;
  coverage: {
    lines: number;
    functions: number;
    branches: number;
  };
}

export interface ValidationConfig {
  requiredMutationScore: number;
  requiredCoverage: number;
  maxTestDurationMs: number;
  healAttempts: number;
  sandboxEnabled: boolean;
}

export interface ChangeSet {
  moduleId: string;
  changedFiles: string[];
  timestamp: Date;
  diff: string;
}
