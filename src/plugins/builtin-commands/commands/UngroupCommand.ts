import { Command } from "../../../core";
import { EditorSession } from "../../../core";

export class UngroupCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 1) {
            throw new Error("usage: ungroup <gid>");
        }

        document.ungroup(args[0]!);

        return `g#${args[0]} ungrouped`;
    }
}