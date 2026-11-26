import type { CommandContribution, ExtensionReader } from "../../core/extensions";

export class HelpCommand implements CommandContribution {
    public readonly name = "help";
    public readonly help = "help";
    public readonly section = "显示";
    public constructor(private readonly extensions: ExtensionReader) { }
    public execute(args: readonly string[]): string {
        if (args.length !== 0) throw new Error("usage: help");
        const sections = new Map<string, string[]>();
        for (const command of this.extensions.getCommands()) {
            const lines = sections.get(command.section) ?? [];
            lines.push(`  ${command.help}`);
            sections.set(command.section, lines);
        }
        const blocks = [...sections].map(([section, lines]) => `${section}：\n${lines.join("\n")}`);
        return `${blocks.join("\n\n")}\n\n支持的图形：${this.extensions.getShapes().map((provider) => provider.type).join("、")}。\n带空格的参数请使用双引号包裹。\n按 Ctrl+C 退出。`;
    }
}
