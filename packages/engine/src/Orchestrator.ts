// packages/engine/src/Orchestrator.ts
import { ModuleRegistry } from "./ModuleRegistry";
import { TestRunner } from "./TestRunner";
import { AdaptivePlanner } from "./AdaptivePlanner";

export class AutonomousValidationCore {
  constructor(
    private registry: ModuleRegistry,
    private testRunner: TestRunner,
    private planner: AdaptivePlanner
  ) {}

  async lockAndTestModule(moduleId: string): Promise<boolean> {
    const module = this.registry.get(moduleId);
    if (!module) throw new Error(`Module ${moduleId} not found`);

    // 1. Validate dependencies are already locked and tested
    for (const depId of module.dependencies) {
      const dep = this.registry.get(depId);
      if (!dep?.locked || !dep.testsPassed) {
        throw new Error(`Dependency ${depId} must be locked and tested first`);
      }
    }

    // 2. Run full test suite (including mutation testing)
    const testResult = await this.testRunner.runAll(module);

    // 3. Lock the module if all tests pass and mutation score ≥ 90%
    if (testResult.passed && testResult.mutationScore >= 0.9) {
      this.registry.lock(moduleId);
      console.log(`✅ Module ${moduleId} locked with mutation score ${testResult.mutationScore * 100}%`);
      return true;
    } else {
      console.error(`❌ Module ${moduleId} failed tests or low mutation score`);
      return false;
    }
  }

  async adaptToChanges(moduleId: string, changedFiles: string[]): Promise<void> {
    console.log(`🔄 Adapting module ${moduleId} due to changes in: ${changedFiles.join(", ")}`);
    const updatedSpec = await this.planner.regenerateSpec(moduleId, changedFiles);
    await this.planner.updateTests(moduleId, updatedSpec);
    await this.lockAndTestModule(moduleId);
  }
}
