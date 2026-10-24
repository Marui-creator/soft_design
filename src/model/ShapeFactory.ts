import { Shape } from "./Shape";
import { Rect } from "./Rect";
import { Circle } from "./Circle";

export class ShapeFactory {
  public create(type: string, args: readonly string[]): Shape {
    if (type === "rect") {
      return this.createRect(args);
    }

    if (type === "circle") {
      return this.createCircle(args);
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
}