import type { Plugin, PluginContext, Shape, SvgDocument, TreeDecorator, TreeLineContext } from "../../core";

interface SavedShape {
    readonly xml: string;
    readonly parentId: string | undefined;
}

/** 保存点索引只属于该标签实例；不监听或记忆“曾执行过编辑命令”。 */
export class ModifiedStarDecorator implements TreeDecorator {
    private baselineXml: string | undefined;
    private readonly savedShapes = new Map<string, SavedShape>();

    public decorate(context: TreeLineContext): string {
        this.updateBaseline(context.savedDocument);
        if (this.baselineXml === undefined) return "*";
        if (context.shape === undefined) {
            return context.document.toSvgElement().toXml() === this.baselineXml ? "" : "*";
        }
        const previous = this.savedShapes.get(context.shape.getId());
        return previous && previous.parentId === context.shape.getParentId() &&
            previous.xml === context.shape.toSvgElement().toXml() ? "" : "*";
    }

    private updateBaseline(document: SvgDocument | undefined): void {
        if (document === undefined) {
            this.baselineXml = undefined;
            this.savedShapes.clear();
            return;
        }
        const xml = document.toSvgElement().toXml();
        if (xml === this.baselineXml) return;
        this.baselineXml = xml;
        this.savedShapes.clear();
        const visit = (shape: Shape): void => {
            this.savedShapes.set(shape.getId(), {
                xml: shape.toSvgElement().toXml(), parentId: shape.getParentId(),
            });
            for (const child of shape.getChildren()) visit(child);
        };
        for (const shape of document.getShapes()) visit(shape);
    }
}

export default class TreeStarPlugin implements Plugin {
    public readonly name = "@svgframe/plugin-tree-star";
    public readonly contributes = { decorators: ["modified-star"] };
    public activate(context: PluginContext): void {
        context.registerDecorator("modified-star", new ModifiedStarDecorator());
    }
}
