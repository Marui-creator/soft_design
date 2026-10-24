import { Shape } from "./Shape";
import { Rect } from "./Rect";

export class ShapeFactory {
  public create(type: string, args: readonly string[]): Shape {
    if (type !== "rect") {
      throw new Error(
        `unknown shape type: ${type} (is the plugin loaded?)`,
      );
    }

    if (args.length !== 5 && args.length !== 6) {
      throw new Error("usage: create rect <id> <x> <y> <w> <h> [fill]");
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
}