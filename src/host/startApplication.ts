import { createApplication } from "./createApplication";
import { assembleOptionalPlugins } from "./codePlugins";
import { PluginLoader } from "./plugins/PluginLoader";

export function startApplication(args: readonly string[] = process.argv.slice(2)): void {
    const runtime = createApplication();
    const loader = new PluginLoader(runtime.registry, runtime.services);
    if (args.length === 0) assembleOptionalPlugins(loader);
    else if (args.length === 2 && args[0] === "--config") loader.loadConfig(args[1]!);
    else if (!(args.length === 1 && args[0] === "--no-plugins")) console.log("error: invalid plugin config");
    runtime.application.run();
}
