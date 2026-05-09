import { exec } from 'child_process';
import { promisify } from 'util';
import { ModuleMetadata, TestResult } from './types.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

const execAsync = promisify(exec);

export class TestRunner {
  private workspaceRoot: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.workspaceRoot = workspaceRoot;
  }

  async runAll(module: ModuleMetadata): Promise<TestResult> {
    const start = Date.now();
    const failedTests: Array<{ name: string; error: string }> = [];
    const passedTests: Array<{ name: string; duration: number }> = [];

    try {
      // Run unit tests
      const unitResult = await this.runUnitTests(module);
      passedTests.push(...unitResult.passed);
      failedTests.push(...unitResult.failed);

      // Run integration tests if they exist
      const integrationResult = await this.runIntegrationTests(module);
      passedTests.push(...integrationResult.passed);
      failedTests.push(...integrationResult.failed);

      const durationMs = Date.now() - start;

      return {
        moduleId: module.id,
        passed: failedTests.length === 0,
        failedTests,
        passedTests,
        durationMs,
        mutantsKilled: 0,
        mutantsTotal: 0,
        coverage: {
          lines: 0,
          functions: 0,
          branches: 0
        }
      };
    } catch (error) {
      return {
        moduleId: module.id,
        passed: false,
        failedTests: [{ name: 'execution', error: String(error) }],
        passedTests: [],
        durationMs: Date.now() - start,
        mutantsKilled: 0,
        mutantsTotal: 0,
        coverage: {
          lines: 0,
          functions: 0,
          branches: 0
        }
      };
    }
  }

  private async runUnitTests(module: ModuleMetadata): Promise<{ passed: Array<{ name: string; duration: number }>, failed: Array<{ name: string; error: string }> }> {
    const modulePath = resolve(this.workspaceRoot, 'packages', module.name);
    const testPath = resolve(modulePath, 'tests');

    if (!existsSync(testPath)) {
      return { passed: [], failed: [] };
    }

    try {
      const { stdout } = await execAsync(`npm test -- --reporter=json --outputFile=test-results.json`, {
        cwd: modulePath,
        env: { ...process.env, CI: 'true' }
      });

      // Parse vitest output
      const results = JSON.parse(stdout);
      const passed = results.testResults
        .filter((r: any) => r.status === 'passed')
        .map((r: any) => ({ name: r.name, duration: r.duration }));
      const failed = results.testResults
        .filter((r: any) => r.status === 'failed')
        .map((r: any) => ({ name: r.name, error: r.message }));

      return { passed, failed };
    } catch (error: any) {
      // Try to parse error output
      if (error.stdout) {
        try {
          const results = JSON.parse(error.stdout);
          const passed = results.testResults
            .filter((r: any) => r.status === 'passed')
            .map((r: any) => ({ name: r.name, duration: r.duration }));
          const failed = results.testResults
            .filter((r: any) => r.status === 'failed')
            .map((r: any) => ({ name: r.name, error: r.message }));
          return { passed, failed };
        } catch {
          // Fallback
        }
      }
      return { passed: [], failed: [{ name: 'test', error: error.message }] };
    }
  }

  private async runIntegrationTests(module: ModuleMetadata): Promise<{ passed: Array<{ name: string; duration: number }>, failed: Array<{ name: string; error: string }> }> {
    // Integration tests would run against sandboxed environment
    // For now, return empty results
    return { passed: [], failed: [] };
  }
}
