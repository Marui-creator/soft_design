import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class DeleteCommand implements Command {
  public constructor(private readonly session: EditorSession) {}

  public execute(args: readonly string[]): string {
    const document = this.session.getDocument();

    if (args.length !== 1) {
      throw new Error("usage: delete <id>");
    }

    const shape = document.removeShape(args[0]!);

    return `shape#${shape.getId()} deleted`;
  }
}