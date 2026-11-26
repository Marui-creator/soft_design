import { ExtensionRegistry } from "../core/ExtensionRegistry";
import type { Plugin, PluginContext, PluginServices } from "../core/extensions";

/** 代码装配与配置加载的共用入口；暂存注册在清单校验成功后提交。 */
export function activatePlugin(registry: ExtensionRegistry, plugin: Plugin, options?: unknown, services?: PluginServices): void {
    const staged = registry.fork();
    const before = registry.names();
    let active = true;
    const guard = <T extends unknown[]>(fn: (...args: T) => void) => (...args: T) => {
        if (!active) throw new Error(`plugin context is closed: ${plugin.name}`);
        fn(...args);
    };
    const context: PluginContext = Object.freeze({
        directories: services?.directories ?? {
            currentDirectory: () => { throw new Error("no directory service"); },
            read: () => { throw new Error("no directory service"); },
        },
        editor: services?.editor ?? {
            getDocument: () => { throw new Error("no editor service"); },
            getSavedDocument: () => undefined,
        },
        createShape: (type: string, args: readonly string[]) => {
            if (!services) throw new Error("no shape creation service");
            return services.createShape(type, args);
        },
        registerShape: guard(staged.registerShape.bind(staged)),
        registerCommand: guard(staged.registerCommand.bind(staged)),
        registerDecorator: guard(staged.registerDecorator.bind(staged)),
        registerAttribute: guard(staged.registerAttribute.bind(staged)),
    });
    try {
        const result: unknown = plugin.activate(context, options);
        if (result && typeof (result as { then?: unknown }).then === "function") {
            void Promise.resolve(result).catch(() => undefined);
            throw new Error("async activation is not supported");
        }
    } finally { active = false; }
    const after = staged.names();
    for (const category of ["shapes", "commands", "decorators", "attributes"] as const) {
        const expected = plugin.contributes[category] ?? [];
        const actual = after[category].filter((name) => !before[category].includes(name));
        if (new Set(expected).size !== expected.length ||
            JSON.stringify([...expected].sort()) !== JSON.stringify(actual.sort())) {
            throw new Error(`plugin manifest mismatch: ${plugin.name} (declared: ${category}=${[...expected].sort().join(",")}, registered: ${category}=${actual.join(",")})`);
        }
    }
    registry.commit(staged);
}
