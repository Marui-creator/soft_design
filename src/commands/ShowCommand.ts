import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class ShowCommand implements Command {
  public constructor(private readonly session: EditorSession) {}

  public execute(args: readonly string[]): string {
    const document = this.session.getDocument();

    if (args.length !== 1) {
      throw new Error("usage: show <id>");
    }

    return document.getShape(args[0]!).describe();
  }
}