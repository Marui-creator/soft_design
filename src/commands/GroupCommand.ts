import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class GroupCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length < 2) {
            throw new Error("usage: group <newGid> <id1> [id2...]");
        }

        const [newId, ...ids] = args;
        const group = document.groupShapes(newId!, ids);

        return (
            `g#${group.getId()} created with ` +
            `${group.getChildren().length} children`
        );
    }
}