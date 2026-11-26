import { Group } from "../../core";
import type {
    AttributeContext, AttributeHandler, Plugin, PluginContext, ShapeProvider,
    ShapeReadContext, SvgElement, TreeDecorator, TreeLineContext,
} from "../../core";
import { BoxShape } from "./BoxShape";
export { BoxShape } from "./BoxShape";

export class BoxProvider implements ShapeProvider {
    public readonly type = "box";
    public readonly readPriority = 100;
    public constructor(private readonly createPart: PluginContext["createShape"], private readonly fill = "#4a90d9") { }

    public create(args: readonly string[]): BoxShape {
        if (args.length !== 6) throw new Error('usage: create box <id> <x> <y> <w> <h> "<title>"');
        const [id, x, y, width, height, title] = args;
        const numbers = [x!, y!, width!, height!].map(Number);
        if ([x!, y!, width!, height!].some((value) => !value.trim()) || !numbers.every(Number.isFinite)) {
            throw new Error("geometry values must be finite numbers");
        }
        if (numbers[2]! < 0 || numbers[3]! < 0) throw new Error("rectangle dimensions must not be negative");
        const group = new Group(id!);
        group.addChild(this.createPart("rect", [`${id}-rect`, x!, y!, width!, height!, this.fill]));
        group.addChild(this.createPart("text", [`${id}-label`, String(numbers[0]! + 20), String(numbers[1]! + 35), title!]));
        return new BoxShape(group);
    }

    public canRead(element: SvgElement): boolean {
        return element.getTag() === "g" && element.getAttribute("data-kind") === "box";
    }

    public read(element: SvgElement, context: ShapeReadContext): BoxShape {
        const id = element.getAttribute("id");
        if (!id?.trim()) throw new Error("missing id on <g>");
        const group = new Group(id);
        group.setTransform(element.getAttribute("transform"));
        for (const name of ["fill", "stroke", "stroke-width"]) {
            const value = element.getAttribute(name);
            if (value !== undefined) group.setAttribute(name, value);
        }
        for (const child of element.getChildren()) group.addChild(context.read(child));
        return new BoxShape(group);
    }
}

export class BoxAttributeHandler implements AttributeHandler {
    public handles(context: AttributeContext, attribute: string): boolean {
        return context.shape instanceof BoxShape && (attribute === "fill" || attribute === "label");
    }
    public apply(context: AttributeContext, attribute: string, value: string): void {
        if (!(context.shape instanceof BoxShape) || (attribute !== "fill" && attribute !== "label")) {
            throw new Error(`unsupported box attribute: ${attribute}`);
        }
        if (attribute === "fill") context.shape.setBodyFill(value);
        else context.shape.setTitle(value);
    }
}

export class BoxTypeDecorator implements TreeDecorator {
    public decorate(context: TreeLineContext): string {
        return context.shape instanceof BoxShape ? "(box)" : "";
    }
}

export default class BoxPlugin implements Plugin {
    public readonly name = "@svgframe/plugin-shape-box";
    public readonly contributes = {
        shapes: ["box"], attributes: ["box-attributes"], decorators: ["box-type-label"],
    };
    public activate(context: PluginContext, options?: unknown): void {
        let fill = "#4a90d9";
        if (options !== undefined) {
            if (!options || typeof options !== "object" || Array.isArray(options) ||
                Object.keys(options).some((key) => key !== "fill") ||
                ("fill" in options && typeof options.fill !== "string")) throw new Error("invalid box options");
            if ("fill" in options) fill = options.fill as string;
        }
        context.registerShape("box", new BoxProvider(context.createShape, fill));
        context.registerAttribute("box-attributes", new BoxAttributeHandler());
        context.registerDecorator("box-type-label", new BoxTypeDecorator());
    }
}
