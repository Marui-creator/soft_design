import type { CommandContribution, DirectoryEntry, DirectoryReader, Plugin, PluginContext } from "../../core";

export class DirCommand implements CommandContribution {
    public readonly name = "dir";
    public readonly help = "dir";
    public readonly section = "显示";
    public constructor(private readonly directories: DirectoryReader) { }

    public execute(args: readonly string[]): string {
        if (args.length !== 0) throw new Error("usage: dir");
        const cwd = this.directories.currentDirectory();
        let entries: readonly DirectoryEntry[];
        try { entries = this.directories.read(cwd); }
        catch { throw new Error(`cannot read directory: ${cwd}`); }
        const rank = { directory: 0, file: 1, link: 2, other: 3 };
        const markers = { directory: "DIR", file: "FILE", link: "LINK", other: "OTHER" };
        const sorted = entries.filter((entry) => entry.name !== "." && entry.name !== "..").sort((left, right) =>
            rank[left.kind] - rank[right.kind] || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
        return sorted.length === 0 ? "(empty directory)" :
            sorted.map((entry) => `[${markers[entry.kind]}]  ${entry.name}`).join("\n");
    }
}

export default class DirPlugin implements Plugin {
    public readonly name = "@svgframe/plugin-command-dir";
    public readonly contributes = { commands: ["dir"] };
    public activate(context: PluginContext): void {
        context.registerCommand("dir", new DirCommand(context.directories));
    }
}
