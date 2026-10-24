import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class SetCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 3) {
            throw new Error("usage: set <id> <attr> <value>");
        }

        const [id, name, value] = args;
        const shape = document.getShape(id!);

        shape.setAttribute(name!, value!);

        return `shape#${shape.getId()} updated: ${name}=${value}`;
    }
}