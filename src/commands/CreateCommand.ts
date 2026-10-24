import { Command } from "./Command";
import { EditorSession } from "./EditorSession";
import { ShapeFactory } from "../model/ShapeFactory";

export class CreateCommand implements Command {
  public constructor(
    private readonly session: EditorSession,
    private readonly factory: ShapeFactory,
  ) {}

  public execute(args: readonly string[]): string {
    const document = this.session.getDocument();
    const [type, ...shapeArgs] = args;

    if (type === undefined) {
      throw new Error("usage: create <type> <id> [params...]");
    }

    const shape = this.factory.create(type, shapeArgs);
    document.addShape(shape);

    return `${type}#${shape.getId()} created`;
  }
}