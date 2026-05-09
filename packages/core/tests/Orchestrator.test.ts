import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AutonomousValidationCore } from '../src/Orchestrator.js';
import { ModuleRegistry } from '../src/ModuleRegistry.js';
import { TestRunner } from '../src/TestRunner.js';
import { SelfHealingTestRunner } from '../src/SelfHealingTestRunner.js';
import { MutationTester } from '../src/MutationTester.js';
import { AdaptivePlanner } from '../src/AdaptivePlanner.js';
import { ModuleMetadata, ValidationConfig } from '../src/types.js';

describe('AutonomousValidationCore', () => {
  let core: AutonomousValidationCore;
  let registry: ModuleRegistry;
  let testRunner: TestRunner;
  let healingRunner: SelfHealingTestRunner;
  let mutationTester: MutationTester;
  let planner: AdaptivePlanner;
  let config: ValidationConfig;

  beforeEach(() => {
    registry = new ModuleRegistry();
    testRunner = new TestRunner();
    healingRunner = new SelfHealingTestRunner('test-key');
    mutationTester = new MutationTester();
    planner = new AdaptivePlanner('test-key');
    config = {
      requiredMutationScore: 0.9,
      requiredCoverage: 80,
      maxTestDurationMs: 30000,
      healAttempts: 3,
      sandboxEnabled: true
    };

    core = new AutonomousValidationCore(
      registry,
      testRunner,
      healingRunner,
      mutationTester,
      planner,
      config
    );
  });

  it('should successfully lock a valid module', async () => {
    const module: ModuleMetadata = {
      id: 'test-module',
      name: 'test',
      version: '1.0.0',
      dependencies: [],
      entrypoint: 'index.ts',
      locked: false,
      testsPassed: false,
      lastTestedAt: new Date(),
      mutationScore: 0,
      testCoverage: 0,
      lastMutantRun: null
    };

    registry.register(module);
    
    // Mock successful test runs
    vi.spyOn(healingRunner, 'runWithHealing').mockResolvedValue({
      moduleId: 'test-module',
      passed: true,
      failedTests: [],
      passedTests: [{ name: 'test1', duration: 100 }],
      durationMs: 500,
      mutantsKilled: 95,
      mutantsTotal: 100,
      coverage: { lines: 85, functions: 80, branches: 75 }
    });

    vi.spyOn(mutationTester, 'runMutationTests').mockResolvedValue({
      killed: 95,
      total: 100,
      score: 0.95
    });

    const result = await core.lockAndTestModule('test-module');
    expect(result).toBe(true);
    
    const lockedModule = registry.get('test-module');
    expect(lockedModule?.locked).toBe(true);
    expect(lockedModule?.testsPassed).toBe(true);
  });

  it('should reject module with low mutation score', async () => {
    const module: ModuleMetadata = {
      id: 'bad-module',
      name: 'bad',
      version: '1.0.0',
      dependencies: [],
      entrypoint: 'index.ts',
      locked: false,
      testsPassed: false,
      lastTestedAt: new Date(),
      mutationScore: 0,
      testCoverage: 0,
      lastMutantRun: null
    };

    registry.register(module);
    
    vi.spyOn(healingRunner, 'runWithHealing').mockResolvedValue({
      moduleId: 'bad-module',
      passed: true,
      failedTests: [],
      passedTests: [{ name: 'test1', duration: 100 }],
      durationMs: 500,
      mutantsKilled: 50,
      mutantsTotal: 100,
      coverage: { lines: 60, functions: 55, branches: 50 }
    });

    vi.spyOn(mutationTester, 'runMutationTests').mockResolvedValue({
      killed: 50,
      total: 100,
      score: 0.5
    });

    const result = await core.lockAndTestModule('bad-module');
    expect(result).toBe(false);
    
    const lockedModule = registry.get('bad-module');
    expect(lockedModule?.locked).toBe(false);
  });

  it('should reject module with failing dependencies', async () => {
    const depModule: ModuleMetadata = {
      id: 'dependency',
      name: 'dep',
      version: '1.0.0',
      dependencies: [],
      entrypoint: 'index.ts',
      locked: false,
      testsPassed: false,
      lastTestedAt: new Date(),
      mutationScore: 0,
      testCoverage: 0,
      lastMutantRun: null
    };

    const mainModule: ModuleMetadata = {
      id: 'main',
      name: 'main',
      version: '1.0.0',
      dependencies: ['dependency'],
      entrypoint: 'index.ts',
      locked: false,
      testsPassed: false,
      lastTestedAt: new Date(),
      mutationScore: 0,
      testCoverage: 0,
      lastMutantRun: null
    };

    registry.register(depModule);
    registry.register(mainModule);

    await expect(core.lockAndTestModule('main')).rejects.toThrow('Dependencies');
  });

  it('should adapt to code changes', async () => {
    const module: ModuleMetadata = {
      id: 'adaptable',
      name: 'adaptable',
      version: '1.0.0',
      dependencies: [],
      entrypoint: 'index.ts',
      locked: true,
      testsPassed: true,
      lastTestedAt: new Date(),
      mutationScore: 0.95,
      testCoverage: 85,
      lastMutantRun: new Date()
    };

    registry.register(module);
    
    const changeSet = {
      moduleId: 'adaptable',
      changedFiles: ['src/index.ts'],
      timestamp: new Date(),
      diff: '+console.log("new change")'
    };

    vi.spyOn(planner, 'regenerateSpec').mockResolvedValue('{"tests":{}}');
    vi.spyOn(planner, 'updateTests').mockResolvedValue();
    vi.spyOn(healingRunner, 'runWithHealing').mockResolvedValue({
      moduleId: 'adaptable',
      passed: true,
      failedTests: [],
      passedTests: [],
      durationMs: 100,
      mutantsKilled: 95,
      mutantsTotal: 100,
      coverage: { lines: 85, functions: 80, branches: 75 }
    });
    vi.spyOn(mutationTester, 'runMutationTests').mockResolvedValue({
      killed: 95,
      total: 100,
      score: 0.95
    });

    await core.adaptToChanges(changeSet);
    
    const updatedModule = registry.get('adaptable');
    expect(updatedModule?.locked).toBe(true);
  });

  it('should validate all modules in dependency order', async () => {
    const module1: ModuleMetadata = {
      id: 'base',
      name: 'base',
      version: '1.0.0',
      dependencies: [],
      entrypoint: 'index.ts',
      locked: false,
      testsPassed: false,
      lastTestedAt: new Date(),
      mutationScore: 0,
      testCoverage: 0,
      lastMutantRun: null
    };

    const module2: ModuleMetadata = {
      id: 'dependent',
      name: 'dependent',
      version: '1.0.0',
      dependencies: ['base'],
      entrypoint: 'index.ts',
      locked: false,
      testsPassed: false,
      lastTestedAt: new Date(),
      mutationScore: 0,
      testCoverage: 0,
      lastMutantRun: null
    };

    registry.register(module1);
    registry.register(module2);

    vi.spyOn(healingRunner, 'runWithHealing').mockResolvedValue({
      moduleId: 'any',
      passed: true,
      failedTests: [],
      passedTests: [],
      durationMs: 100,
      mutantsKilled: 95,
      mutantsTotal: 100,
      coverage: { lines: 85, functions: 80, branches: 75 }
    });
    vi.spyOn(mutationTester, 'runMutationTests').mockResolvedValue({
      killed: 95,
      total: 100,
      score: 0.95
    });

    const results = await core.validateAllModules();
    
    expect(results.get('base')).toBe(true);
    expect(results.get('dependent')).toBe(true);
  });
});
