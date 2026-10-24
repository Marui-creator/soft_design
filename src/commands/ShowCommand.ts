import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class ShowCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 1) {
            throw new Error("usage: show <id>");
        }

        const shape = document.getShape(args[0]!);
        const transform = shape.getTransform();

        return (
            shape.describe() +
            (transform === undefined
                ? ""
                : `\n  transform=${JSON.stringify(transform)}`)
        );
    }
}