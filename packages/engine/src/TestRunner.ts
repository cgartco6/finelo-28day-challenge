import { ModuleMetadata, TestResult } from "./types.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class TestRunner {
  async runAll(module: ModuleMetadata): Promise<TestResult> {
    const start = Date.now();
    try {
      // Run unit tests
      const { stdout, stderr } = await execAsync(`npm test --workspace=${module.name}`);
      // In production, also run integration and contract tests.
      console.log(`Test output: ${stdout}`);
      return {
        moduleId: module.id,
        passed: true,
        failedTests: [],
        durationMs: Date.now() - start,
        mutantsKilled: 0,
        mutantsTotal: 0
      };
    } catch (error) {
      return {
        moduleId: module.id,
        passed: false,
        failedTests: [{ name: "all", error: String(error) }],
        durationMs: Date.now() - start,
        mutantsKilled: 0,
        mutantsTotal: 0
      };
    }
  }
}
