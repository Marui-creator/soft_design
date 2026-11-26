import type { Command } from "../../commands/Command";
import type { CommandContribution, Plugin, PluginContext } from "../../core/extensions";

/** 将既有命令适配为带名称、帮助与分组的贡献，不改变 execute 语义。 */
export class NamedCommand implements CommandContribution {
    public constructor(
        public readonly name: string,
        public readonly help: string,
        public readonly section: string,
        private readonly command: Command,
    ) { }
    public execute(args: readonly string[]): string { return this.command.execute(args); }
}

export default class BuiltinCommandsPlugin implements Plugin {
    public readonly name = "builtin-commands";
    public readonly contributes;
    public constructor(private readonly commands: readonly CommandContribution[]) {
        this.contributes = { commands: commands.map((command) => command.name) };
    }
    public activate(context: PluginContext): void {
        for (const command of this.commands) context.registerCommand(command.name, command);
    }
}
