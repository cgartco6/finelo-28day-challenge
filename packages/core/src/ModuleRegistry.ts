import { ModuleMetadata } from './types.js';

export class ModuleRegistry {
  private modules = new Map<string, ModuleMetadata>();
  private dependencyGraph = new Map<string, Set<string>>();

  register(module: ModuleMetadata): void {
    this.modules.set(module.id, module);
    this.dependencyGraph.set(module.id, new Set(module.dependencies));
  }

  get(id: string): ModuleMetadata | undefined {
    return this.modules.get(id);
  }

  getAll(): ModuleMetadata[] {
    return Array.from(this.modules.values());
  }

  lock(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.locked = true;
      module.testsPassed = true;
      module.lastTestedAt = new Date();
      this.modules.set(moduleId, module);
    }
  }

  unlock(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.locked = false;
      module.testsPassed = false;
      this.modules.set(moduleId, module);
    }
  }

  getDependencies(moduleId: string): string[] {
    return Array.from(this.dependencyGraph.get(moduleId) || []);
  }

  getDependents(moduleId: string): string[] {
    const dependents: string[] = [];
    for (const [id, deps] of this.dependencyGraph.entries()) {
      if (deps.has(moduleId)) {
        dependents.push(id);
      }
    }
    return dependents;
  }

  validateDependencies(moduleId: string): boolean {
    const module = this.modules.get(moduleId);
    if (!module) return false;

    for (const depId of module.dependencies) {
      const dep = this.modules.get(depId);
      if (!dep || !dep.locked || !dep.testsPassed) {
        return false;
      }
    }
    return true;
  }

  updateMutationScore(moduleId: string, score: number): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.mutationScore = score;
      module.lastMutantRun = new Date();
      this.modules.set(moduleId, module);
    }
  }
}
