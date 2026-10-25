import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class FrontCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 1) {
            throw new Error("usage: front <id>");
        }

        document.bringToFront(args[0]!);

        const shape = document.getShape(args[0]!);
        return `${shape.getLabel()} brought to front`;
    }
}