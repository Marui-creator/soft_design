import { Command } from "../../../core";
import { EditorSession } from "../../../core";

export class AddToCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 2) {
            throw new Error("usage: addto <gid> <id>");
        }

        const [containerId, id] = args;

        document.addTo(containerId!, id!);

        const shape = document.getShape(id!);
        return `${shape.getLabel()} moved into g#${containerId}`;
    }
}