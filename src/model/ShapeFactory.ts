import { Shape } from "./Shape";
import { Rect } from "./Rect";
import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Line } from "./Line";
import { Text } from "./Text";
import { Group } from "./Group";
import { SvgElement } from "./SvgElement";

export class ShapeFactory {
    public create(type: string, args: readonly string[]): Shape {
        if (type === "rect") {
            return this.createRect(args);
        }

        if (type === "circle") {
            return this.createCircle(args);
        }

        if (type === "ellipse") {
            return this.createEllipse(args);
        }

        if (type === "line") {
            return this.createLine(args);
        }

        if (type === "text") {
            return this.createText(args);
        }

        if (type === "g") {
            if (args.length !== 1) {
                throw new Error("usage: create g <id>");
            }

            return new Group(args[0]!);
        }

        throw new Error(
            `unknown shape type: ${type} (is the plugin loaded?)`,
        );
    }

    private createRect(args: readonly string[]): Rect {
        if (args.length !== 5 && args.length !== 6) {
            throw new Error(
                "usage: create rect <id> <x> <y> <w> <h> [fill]",
            );
        }

        const [id, x, y, width, height, fill] = args;

        return new Rect(
            id!,
            Number(x),
            Number(y),
            Number(width),
            Number(height),
            fill,
        );
    }

    private createCircle(args: readonly string[]): Circle {
        if (args.length !== 4 && args.length !== 5) {
            throw new Error(
                "usage: create circle <id> <cx> <cy> <r> [fill]",
            );
        }

        const [id, cx, cy, r, fill] = args;

        return new Circle(
            id!,
            Number(cx),
            Number(cy),
            Number(r),
            fill,
        );
    }

    private createEllipse(args: readonly string[]): Ellipse {
        if (args.length !== 5 && args.length !== 6) {
            throw new Error(
                "usage: create ellipse <id> <cx> <cy> <rx> <ry> [fill]",
            );
        }

        const [id, cx, cy, rx, ry, fill] = args;

        return new Ellipse(
            id!,
            Number(cx),
            Number(cy),
            Number(rx),
            Number(ry),
            fill,
        );
    }

    private createLine(args: readonly string[]): Line {
        if (args.length !== 5 && args.length !== 6) {
            throw new Error(
                "usage: create line <id> <x1> <y1> <x2> <y2> [stroke]",
            );
        }

        const [id, x1, y1, x2, y2, stroke] = args;

        return new Line(
            id!,
            Number(x1),
            Number(y1),
            Number(x2),
            Number(y2),
            stroke,
        );
    }

    private createText(args: readonly string[]): Text {
        if (args.length !== 4) {
            throw new Error(
                'usage: create text <id> <x> <y> "content"',
            );
        }

        const [id, x, y, content] = args;

        return new Text(
            id!,
            Number(x),
            Number(y),
            content!,
        );
    }

    public fromSvgElement(element: SvgElement): Shape {
        const type = element.getTag();
        const id = element.getAttribute("id");

        if (id === undefined || id.trim().length === 0) {
            throw new Error(`missing id on <${type}>`);
        }

        // SVG 中这些几何属性省略时采用零值。
        const geometry = new Map<string, readonly string[]>([
            ["rect", ["x", "y", "width", "height"]],
            ["circle", ["cx", "cy", "r"]],
            ["ellipse", ["cx", "cy", "rx", "ry"]],
            ["line", ["x1", "y1", "x2", "y2"]],
            ["text", ["x", "y"]],
            ["g", []],
        ]);

        const names = geometry.get(type);

        if (names === undefined) {
            throw new Error(
                `unknown shape type: ${type} (is the plugin loaded?)`,
            );
        }

        const args = [
            id,
            ...names.map((name) => {
                const value = element.getAttribute(name) ?? "0";

                if (value.trim().length === 0) {
                    throw new Error(`invalid SVG attribute: ${name}`);
                }

                return value;
            }),
        ];

        if (type === "text") {
            args.push(element.getText() ?? "");
        }

        const shape = this.create(type, args);

        shape.setTransform(element.getAttribute("transform"));

        for (const name of ["fill", "stroke", "stroke-width"]) {
            const value = element.getAttribute(name);

            if (value !== undefined) {
                shape.setAttribute(name, value);
            }
        }

        const children = element.getChildren();

        if (!shape.isContainer() && children.length > 0) {
            throw new Error(`unsupported child elements in <${type}>`);
        }

        for (const child of children) {
            shape.addChild(this.fromSvgElement(child));
        }

        return shape;
    }
}