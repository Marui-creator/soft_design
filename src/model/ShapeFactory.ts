import { Shape } from "./Shape";
import { SvgElement } from "./SvgElement";
import type { ExtensionReader } from "../core/extensions";

export class ShapeFactory {
    public constructor(private readonly extensions: ExtensionReader) { }
    public create(type: string, args: readonly string[]): Shape {
        const provider = this.extensions.getShapes().find((item) => item.type === type);
        if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
        return this.validate(provider.create(args), args[0]);
    }
    public fromSvgElement(element: SvgElement): Shape {
        const type = element.getTag();
        const id = element.getAttribute("id");
        if (id === undefined || id.trim().length === 0) throw new Error(`missing id on <${type}>`);
        const candidates = this.extensions.getShapes().filter((provider) => provider.canRead(element));
        const priority = Math.max(...candidates.map((provider) => provider.readPriority ?? 0));
        const matches = candidates.filter((provider) => (provider.readPriority ?? 0) === priority);
        if (matches.length === 0) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
        if (matches.length > 1) throw new Error(`ambiguous shape provider: ${type}`);
        return this.validate(matches[0]!.read(element, { read: (child) => this.fromSvgElement(child) }), id);
    }
    private validate(shape: Shape, expectedId: string | undefined): Shape {
        if (!(shape instanceof Shape) || shape.getId() !== expectedId) throw new Error("invalid shape provider result");
        return shape;
    }
}
