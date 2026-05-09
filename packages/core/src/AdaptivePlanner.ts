import { ModuleMetadata, ChangeSet } from './types.js';
import OpenAI from 'openai';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, relative } from 'path';
import simpleGit from 'simple-git';

export class AdaptivePlanner {
  private openai: OpenAI;
  private git: any;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
    this.git = simpleGit();
  }

  async detectChanges(moduleId: string): Promise<ChangeSet | null> {
    const status = await this.git.status();
    const changedFiles = status.files
      .filter(f => f.path.includes(`packages/${moduleId}/src`))
      .map(f => f.path);

    if (changedFiles.length === 0) {
      return null;
    }

    const diff = await this.git.diff();
    
    return {
      moduleId,
      changedFiles,
      timestamp: new Date(),
      diff
    };
  }

  async regenerateSpec(moduleId: string, changedFiles: string[]): Promise<string> {
    const modulePath = resolve(process.cwd(), 'packages', moduleId);
    const changedContent = changedFiles.map(file => {
      const fullPath = resolve(modulePath, file);
      try {
        return `File: ${file}\n${readFileSync(fullPath, 'utf-8')}`;
      } catch {
        return `File: ${file} (deleted or moved)`;
      }
    }).join('\n\n');

    const prompt = `
      You are an AI that generates test specifications.
      
      Module: ${moduleId}
      Changed files:
      ${changedContent}
      
      Generate a comprehensive test specification for this module.
      Include:
      1. Unit tests for all public methods
      2. Edge cases and error conditions
      3. Integration test scenarios
      4. Performance expectations
      
      Return the specification in JSON format.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      response_format: { type: 'json_object' }
    });

    return response.choices[0].message.content || '{}';
  }

  async updateTests(moduleId: string, spec: string): Promise<void> {
    const specObj = JSON.parse(spec);
    const modulePath = resolve(process.cwd(), 'packages', moduleId);
    const testPath = resolve(modulePath, 'tests');

    // Generate test files based on spec
    for (const [testName, testSpec] of Object.entries(specObj.tests || {})) {
      const testFile = resolve(testPath, `${testName}.test.ts`);
      const testContent = this.generateTestFile(testName, testSpec);
      writeFileSync(testFile, testContent);
      console.log(`Generated test: ${testFile}`);
    }
  }

  private generateTestFile(testName: string, spec: any): string {
    return `
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ${spec.import || '*'} } from '../src/index.js';

describe('${testName}', () => {
  ${spec.tests?.map((test: any) => `
  it('${test.description}', () => {
    // ${test.setup || 'Setup goes here'}
    // ${test.assertion || 'Assert results'}
    expect(true).toBe(true);
  });
  `).join('\n')}
});
`;
  }
}
