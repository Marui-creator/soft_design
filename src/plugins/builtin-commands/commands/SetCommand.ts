import { Command } from "../../../core";
import { EditorSession } from "../../../core";
import type { ExtensionReader } from "../../../core";

export class SetCommand implements Command {
    public constructor(private readonly session: EditorSession, private readonly extensions: ExtensionReader) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 3) {
            throw new Error("usage: set <id> <attr> <value>");
        }

        const [id, name, value] = args;
        const shape = document.getShape(id!);

        const context = { document, shape };
        const handlers = this.extensions.getAttributes().filter((handler) => handler.handles(context, name!));
        if (handlers.length > 1) throw new Error(`ambiguous attribute handler: ${name}`);
        if (handlers.length === 1) handlers[0]!.apply(context, name!, value!);
        else shape.setAttribute(name!, value!);

        return `${shape.getLabel()} updated: ${name}=${value}`;
    }
}
