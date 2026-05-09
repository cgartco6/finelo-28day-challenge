import { ModuleRegistry, TestRunner, AutonomousValidationCore } from "@finelo/engine";

const registry = new ModuleRegistry();
const testRunner = new TestRunner();
const core = new AutonomousValidationCore(registry, testRunner, null as any);

async function main() {
  const results = await core.lockAndTestModule("challenge");
  console.log("Module locked & tested:", results);
}
main();
