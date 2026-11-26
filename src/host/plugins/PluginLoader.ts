import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { Plugin, PluginManifest, PluginServices } from "../../core/extensions";
import { ExtensionRegistry } from "../../core/ExtensionRegistry";
import { activatePlugin } from "../activatePlugin";

interface PluginEntry { module: string; enabled?: boolean; options?: unknown; }
interface PackageManifest { name: string; contributes: PluginManifest; }
const categories = ["shapes", "commands", "decorators", "attributes"] as const;
function object(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
function reason(error: unknown): string {
    return (error instanceof Error ? error.message : String(error)).replace(/[\r\n]+/g, " ");
}

export class PluginLoader {
    public constructor(
        private readonly registry: ExtensionRegistry,
        private readonly services: PluginServices,
        private readonly report: (message: string) => void = console.log,
    ) { }

    /** A/B 共用注册、校验、回滚与错误报告；包加载只负责构造这个 Plugin。 */
    public loadInstance(plugin: Plugin, options?: unknown): boolean {
        try {
            activatePlugin(this.registry, plugin, options, this.services);
            return true;
        } catch (error) {
            const message = reason(error);
            if (message.startsWith("duplicate registration: ") || message.startsWith("plugin manifest mismatch: ")) {
                this.report(`error: ${message}`);
            } else {
                this.report(`error: plugin failed to activate: ${plugin.name} (${message})`);
            }
            return false;
        }
    }

    public loadConfig(path: string): boolean {
        let entries: PluginEntry[];
        try {
            const config: unknown = JSON.parse(readFileSync(path, "utf8"));
            if (!object(config) || !Array.isArray(config.plugins)) throw new Error("invalid config");
            for (const entry of config.plugins) {
                if (!object(entry) || typeof entry.module !== "string" || !entry.module.trim() ||
                    (entry.enabled !== undefined && typeof entry.enabled !== "boolean")) throw new Error("invalid config");
            }
            entries = config.plugins as PluginEntry[];
        } catch {
            this.report("error: invalid plugin config");
            return false;
        }
        for (const entry of entries) {
            if (entry.enabled === false) continue;
            this.loadModule(entry.module, dirname(resolve(path)), entry.options);
        }
        return true;
    }

    public loadModule(specifier: string, directory: string, options?: unknown): boolean {
        const requireFromConfig = createRequire(join(resolve(directory), "plugins.config.json"));
        let filename: string;
        try {
            // Only resolution failure is "not found"; dependency/evaluation failures are handled below.
            filename = requireFromConfig.resolve(specifier);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
                this.report(`error: plugin not found: ${specifier}`);
            } else {
                this.report(`error: plugin failed to activate: ${specifier} (${reason(error)})`);
            }
            return false;
        }
        let name = specifier;
        try {
            const manifest = this.readManifest(specifier, directory, filename);
            name = manifest.name;
            const namespace: unknown = requireFromConfig(filename);
            if (!object(namespace) || !Object.prototype.hasOwnProperty.call(namespace, "default") || namespace.default == null) {
                this.report(`error: plugin has no default export: ${specifier}`);
                return false;
            }
            const exported = namespace.default;
            const instance: unknown = typeof exported === "function" ? new (exported as new () => unknown)() : exported;
            if (!object(instance) || typeof instance.activate !== "function") throw new Error("default export must be a plugin class or instance");
            // The package manifest, not an arbitrary field supplied by the module, is authoritative.
            const plugin: Plugin = {
                name, contributes: manifest.contributes,
                activate: (context, pluginOptions) => (instance.activate as Plugin["activate"]).call(instance, context, pluginOptions),
            };
            return this.loadInstance(plugin, options);
        } catch (error) {
            this.report(`error: plugin failed to activate: ${name} (${reason(error)})`);
            return false;
        }
    }

    private readManifest(specifier: string, directory: string, filename: string): PackageManifest {
        let manifestPath: string | undefined;
        if (specifier.startsWith(".") || isAbsolute(specifier)) {
            const target = resolve(directory, specifier);
            if (existsSync(target) && statSync(target).isDirectory() && existsSync(join(target, "package.json"))) {
                manifestPath = join(target, "package.json");
            }
        }
        if (!manifestPath) {
            let current = dirname(filename);
            while (true) {
                const candidate = join(current, "package.json");
                if (existsSync(candidate)) { manifestPath = candidate; break; }
                const parent = dirname(current);
                if (parent === current) break;
                current = parent;
            }
        }
        if (!manifestPath) throw new Error("plugin package.json not found");
        const metadata: unknown = JSON.parse(readFileSync(manifestPath, "utf8"));
        if (!object(metadata) || typeof metadata.name !== "string" || !metadata.name.trim()) throw new Error("invalid plugin manifest");
        const contributes = metadata.contributes ?? {};
        if (!object(contributes) || Object.keys(contributes).some((key) => !categories.includes(key as typeof categories[number]))) {
            throw new Error("invalid plugin manifest");
        }
        for (const category of categories) {
            const names = contributes[category];
            if (names !== undefined && (!Array.isArray(names) || names.some((name) => typeof name !== "string" || !name.trim()))) {
                throw new Error("invalid plugin manifest");
            }
        }
        return { name: metadata.name, contributes: contributes as PluginManifest };
    }
}
