import type { Plugin, PluginContext, ShapeProvider, ShapeReadContext } from "../../core/extensions";
import { Shape } from "../../model/Shape";
import { SvgElement } from "../../model/SvgElement";
import { Rect } from "./shapes/Rect";
import { Circle } from "./shapes/Circle";
import { Ellipse } from "./shapes/Ellipse";
import { Line } from "./shapes/Line";
import { Text } from "./shapes/Text";
import { Group } from "../../model/Group";

abstract class BuiltinShapeProvider implements ShapeProvider {
    public abstract readonly type: string;
    protected abstract readonly geometry: readonly string[];
    public abstract create(args: readonly string[]): Shape;
    public canRead(element: SvgElement): boolean { return element.getTag() === this.type; }

    public read(element: SvgElement, context: ShapeReadContext): Shape {
        const args = [element.getAttribute("id")!, ...this.geometry.map((name) => {
            const value = element.getAttribute(name) ?? "0";
            if (value.trim().length === 0) throw new Error(`invalid SVG attribute: ${name}`);
            return value;
        })];
        if (this.type === "text") args.push(element.getText() ?? "");
        const shape = this.create(args);
        shape.setTransform(element.getAttribute("transform"));
        for (const name of ["fill", "stroke", "stroke-width"]) {
            const value = element.getAttribute(name);
            if (value !== undefined) shape.setAttribute(name, value);
        }
        const children = element.getChildren();
        if (!shape.isContainer() && children.length > 0) throw new Error(`unsupported child elements in <${this.type}>`);
        for (const child of children) shape.addChild(context.read(child));
        return shape;
    }
    protected check(args: readonly string[], lengths: readonly number[], usage: string): void {
        if (!lengths.includes(args.length)) throw new Error(`usage: create ${usage}`);
    }
}

export class RectProvider extends BuiltinShapeProvider {
    public readonly type = "rect";
    protected readonly geometry = ["x", "y", "width", "height"];
    public create(args: readonly string[]): Shape {
        this.check(args, [5, 6], "rect <id> <x> <y> <w> <h> [fill]");
        return new Rect(args[0]!, Number(args[1]), Number(args[2]), Number(args[3]), Number(args[4]), args[5]);
    }
}
export class CircleProvider extends BuiltinShapeProvider {
    public readonly type = "circle";
    protected readonly geometry = ["cx", "cy", "r"];
    public create(args: readonly string[]): Shape {
        this.check(args, [4, 5], "circle <id> <cx> <cy> <r> [fill]");
        return new Circle(args[0]!, Number(args[1]), Number(args[2]), Number(args[3]), args[4]);
    }
}
export class EllipseProvider extends BuiltinShapeProvider {
    public readonly type = "ellipse";
    protected readonly geometry = ["cx", "cy", "rx", "ry"];
    public create(args: readonly string[]): Shape {
        this.check(args, [5, 6], "ellipse <id> <cx> <cy> <rx> <ry> [fill]");
        return new Ellipse(args[0]!, Number(args[1]), Number(args[2]), Number(args[3]), Number(args[4]), args[5]);
    }
}
export class LineProvider extends BuiltinShapeProvider {
    public readonly type = "line";
    protected readonly geometry = ["x1", "y1", "x2", "y2"];
    public create(args: readonly string[]): Shape {
        this.check(args, [5, 6], "line <id> <x1> <y1> <x2> <y2> [stroke]");
        return new Line(args[0]!, Number(args[1]), Number(args[2]), Number(args[3]), Number(args[4]), args[5]);
    }
}
export class TextProvider extends BuiltinShapeProvider {
    public readonly type = "text";
    protected readonly geometry = ["x", "y"];
    public create(args: readonly string[]): Shape {
        this.check(args, [4], 'text <id> <x> <y> "content"');
        return new Text(args[0]!, Number(args[1]), Number(args[2]), args[3]!);
    }
}
export class GroupProvider extends BuiltinShapeProvider {
    public readonly type = "g";
    protected readonly geometry: readonly string[] = [];
    public create(args: readonly string[]): Shape {
        this.check(args, [1], "g <id>");
        return new Group(args[0]!);
    }
}
export default class BuiltinShapesPlugin implements Plugin {
    public readonly name = "builtin-shapes";
    public readonly contributes = { shapes: ["rect", "circle", "ellipse", "line", "text", "g"] };
    public activate(context: PluginContext): void {
        for (const provider of [new RectProvider(), new CircleProvider(), new EllipseProvider(),
            new LineProvider(), new TextProvider(), new GroupProvider()]) {
            context.registerShape(provider.type, provider);
        }
    }
}
