import { describe, it, expect, beforeEach } from 'vitest';
import { ModuleRegistry } from '../src/ModuleRegistry.js';
import { ModuleMetadata } from '../src/types.js';

describe('ModuleRegistry', () => {
  let registry: ModuleRegistry;
  
  beforeEach(() => {
    registry = new ModuleRegistry();
  });
  
  it('should register a module', () => {
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
    expect(registry.get('test-module')).toBeDefined();
    expect(registry.get('test-module')?.id).toBe('test-module');
  });
  
  it('should lock a module', () => {
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
    registry.lock('test-module');
    
    const locked = registry.get('test-module');
    expect(locked?.locked).toBe(true);
    expect(locked?.testsPassed).toBe(true);
  });
  
  it('should validate dependencies', () => {
    const depModule: ModuleMetadata = {
      id: 'dependency',
      name: 'dep',
      version: '1.0.0',
      dependencies: [],
      entrypoint: 'index.ts',
      locked: true,
      testsPassed: true,
      lastTestedAt: new Date(),
      mutationScore: 0.95,
      testCoverage: 85,
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
    
    expect(registry.validateDependencies('main')).toBe(true);
    expect(registry.getDependencies('main')).toContain('dependency');
  });
});
