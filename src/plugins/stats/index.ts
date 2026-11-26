import type { CommandContribution, EditorAccess, Plugin, PluginContext, Shape } from "../../core";

export class StatsCommand implements CommandContribution {
    public readonly name = "stats";
    public readonly help = "stats";
    public readonly section = "显示";
    public constructor(private readonly editor: EditorAccess) { }

    public execute(args: readonly string[]): string {
        if (args.length !== 0) throw new Error("usage: stats");
        const counts = new Map<string, number>();
        let total = 0;
        let containers = 0;
        const visit = (shape: Shape): void => {
            if (shape.isContainer()) {
                containers++;
                for (const child of shape.getChildren()) visit(child);
            } else {
                const element = shape.toSvgElement();
                const type = element.getAttribute("data-kind") ?? element.getTag();
                counts.set(type, (counts.get(type) ?? 0) + 1);
                total++;
            }
        };
        for (const shape of this.editor.getDocument().getShapes()) visit(shape);
        const entries = [...counts].map(([type, count]) => `${type}: ${count}`);
        return [...entries, `(total ${total}, containers ${containers})`].join("  ");
    }
}

export default class StatsPlugin implements Plugin {
    public readonly name = "@svgframe/plugin-command-stats";
    public readonly contributes = { commands: ["stats"] };
    public activate(context: PluginContext): void {
        context.registerCommand("stats", new StatsCommand(context.editor));
    }
}
