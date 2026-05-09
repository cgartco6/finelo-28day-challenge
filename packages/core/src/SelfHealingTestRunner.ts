import { ModuleMetadata, TestResult } from './types.js';
import { TestRunner } from './TestRunner.js';
import OpenAI from 'openai';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

export class SelfHealingTestRunner {
  private openai: OpenAI;
  private baseRunner: TestRunner;

  constructor(apiKey: string, workspaceRoot?: string) {
    this.openai = new OpenAI({ apiKey });
    this.baseRunner = new TestRunner(workspaceRoot);
  }

  async runWithHealing(module: ModuleMetadata, maxAttempts: number = 3): Promise<TestResult> {
    let attempts = 0;
    let lastResult: TestResult | null = null;

    while (attempts < maxAttempts) {
      const result = await this.baseRunner.runAll(module);
      lastResult = result;

      if (result.passed) {
        return result;
      }

      console.log(`Healing attempt ${attempts + 1} for module ${module.id}`);
      await this.healTests(module, result);
      attempts++;
    }

    return lastResult!;
  }

  private async healTests(module: ModuleMetadata, failedResult: TestResult): Promise<void> {
    const modulePath = resolve(process.cwd(), 'packages', module.name);
    
    for (const failedTest of failedResult.failedTests) {
      try {
        const testFile = await this.locateTestFile(modulePath, failedTest.name);
        if (!testFile) continue;

        const testContent = readFileSync(testFile, 'utf-8');
        const healedContent = await this.generateHealedTest(testContent, failedTest.error);
        
        writeFileSync(testFile, healedContent);
        console.log(`Healed test: ${failedTest.name}`);
      } catch (error) {
        console.error(`Failed to heal test ${failedTest.name}:`, error);
      }
    }
  }

  private async generateHealedTest(originalTest: string, error: string): Promise<string> {
    const prompt = `
      Original test:
      ${originalTest}
      
      Error message:
      ${error}
      
      Please fix this test to make it pass while maintaining the original intent.
      Return only the fixed test code.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    return response.choices[0].message.content || originalTest;
  }

  private async locateTestFile(modulePath: string, testName: string): Promise<string | null> {
    // Simplified - would need proper test file mapping
    const possiblePaths = [
      resolve(modulePath, 'tests', `${testName}.test.ts`),
      resolve(modulePath, 'tests', 'index.test.ts'),
    ];

    for (const path of possiblePaths) {
      try {
        readFileSync(path, 'utf-8');
        return path;
      } catch {
        continue;
      }
    }
    return null;
  }
}
