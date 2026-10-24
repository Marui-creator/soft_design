import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class BackCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 1) {
            throw new Error("usage: back <id>");
        }

        document.sendToBack(args[0]!);

        return `shape#${args[0]} sent to back`;
    }
}