import { ModuleRegistry } from './ModuleRegistry.js';
import { TestRunner } from './TestRunner.js';
import { SelfHealingTestRunner } from './SelfHealingTestRunner.js';
import { MutationTester } from './MutationTester.js';
import { AdaptivePlanner } from './AdaptivePlanner.js';
import { ModuleMetadata, ValidationConfig, ChangeSet } from './types.js';

export class AutonomousValidationCore {
  private registry: ModuleRegistry;
  private testRunner: TestRunner;
  private healingRunner: SelfHealingTestRunner;
  private mutationTester: MutationTester;
  private planner: AdaptivePlanner;
  private config: ValidationConfig;

  constructor(
    registry: ModuleRegistry,
    testRunner: TestRunner,
    healingRunner: SelfHealingTestRunner,
    mutationTester: MutationTester,
    planner: AdaptivePlanner,
    config: ValidationConfig
  ) {
    this.registry = registry;
    this.testRunner = testRunner;
    this.healingRunner = healingRunner;
    this.mutationTester = mutationTester;
    this.planner = planner;
    this.config = config;
  }

  async lockAndTestModule(moduleId: string): Promise<boolean> {
    console.log(`🔒 Starting validation for module: ${moduleId}`);
    
    const module = this.registry.get(moduleId);
    if (!module) {
      throw new Error(`Module ${moduleId} not found`);
    }

    // Check dependencies
    if (!this.registry.validateDependencies(moduleId)) {
      throw new Error(`Dependencies for ${moduleId} are not locked or failing`);
    }

    // Run self-healing tests
    console.log(`🧪 Running self-healing tests...`);
    const testResult = await this.healingRunner.runWithHealing(module, this.config.healAttempts);
    
    if (!testResult.passed) {
      console.error(`❌ Tests failed for ${moduleId}`);
      return false;
    }

    console.log(`✅ All tests passed in ${testResult.durationMs}ms`);

    // Run mutation tests
    console.log(`🦠 Running mutation tests...`);
    const mutationResult = await this.mutationTester.runMutationTests(module);
    this.registry.updateMutationScore(moduleId, mutationResult.score);

    console.log(`Mutation score: ${(mutationResult.score * 100).toFixed(2)}% (${mutationResult.killed}/${mutationResult.total} mutants killed)`);

    if (mutationResult.score < this.config.requiredMutationScore) {
      console.error(`❌ Mutation score ${mutationResult.score} below required ${this.config.requiredMutationScore}`);
      return false;
    }

    // Lock the module
    this.registry.lock(moduleId);
    console.log(`🔒 Module ${moduleId} is now LOCKED and validated`);

    return true;
  }

  async adaptToChanges(changeSet: ChangeSet): Promise<void> {
    console.log(`🔄 Adapting to changes in ${changeSet.moduleId}`);
    
    // Unlock module if it was locked
    this.registry.unlock(changeSet.moduleId);
    
    // Regenerate specification
    const newSpec = await this.planner.regenerateSpec(changeSet.moduleId, changeSet.changedFiles);
    
    // Update tests based on new spec
    await this.planner.updateTests(changeSet.moduleId, newSpec);
    
    // Re-validate
    const success = await this.lockAndTestModule(changeSet.moduleId);
    
    if (success) {
      console.log(`✅ Successfully adapted module ${changeSet.moduleId}`);
    } else {
      console.error(`❌ Failed to adapt module ${changeSet.moduleId}`);
    }
  }

  async validateAllModules(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    const modules = this.registry.getAll();
    
    // Sort by dependency depth
    const sorted = this.topologicalSort(modules);
    
    for (const module of sorted) {
      const success = await this.lockAndTestModule(module.id);
      results.set(module.id, success);
    }
    
    return results;
  }

  private topologicalSort(modules: ModuleMetadata[]): ModuleMetadata[] {
    const visited = new Set<string>();
    const sorted: ModuleMetadata[] = [];
    const moduleMap = new Map(modules.map(m => [m.id, m]));

    function visit(moduleId: string) {
      if (visited.has(moduleId)) return;
      visited.add(moduleId);
      
      const module = moduleMap.get(moduleId);
      if (module) {
        for (const depId of module.dependencies) {
          visit(depId);
        }
        sorted.push(module);
      }
    }

    for (const module of modules) {
      visit(module.id);
    }

    return sorted;
  }
}
