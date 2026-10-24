import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class MoveCommand implements Command {
  public constructor(private readonly session: EditorSession) {}

  public execute(args: readonly string[]): string {
    const document = this.session.getDocument();

    if (args.length !== 3) {
      throw new Error("usage: move <id> <dx> <dy>");
    }

    const [id, dxText, dyText] = args;
    const dx = Number(dxText);
    const dy = Number(dyText);

    if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
      throw new Error("move offsets must be finite numbers");
    }

    const shape = document.getShape(id!);
    shape.move(dx, dy);

    return `shape#${shape.getId()} moved by (${dx},${dy})`;
  }
}