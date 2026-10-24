import { Shape } from "./Shape";
import { Rect } from "./Rect";
import { Circle } from "./Circle";
import { Ellipse } from "./Ellipse";
import { Line } from "./Line";
import { Text } from "./Text";

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
}