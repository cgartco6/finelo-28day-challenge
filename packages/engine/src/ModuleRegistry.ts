import { ModuleMetadata } from "./types.js";

export class ModuleRegistry {
  private modules = new Map<string, ModuleMetadata>();

  register(module: ModuleMetadata): void {
    this.modules.set(module.id, module);
  }

  get(id: string): ModuleMetadata | undefined {
    return this.modules.get(id);
  }

  lock(moduleId: string): void {
    const module = this.modules.get(moduleId);
    if (module) {
      module.locked = true;
      module.testsPassed = true;
      module.lastTestedAt = new Date();
    }
  }

  all(): ModuleMetadata[] {
    return Array.from(this.modules.values());
  }
}
