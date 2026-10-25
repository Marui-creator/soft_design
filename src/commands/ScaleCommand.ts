import { Command } from "./Command";
import { EditorSession } from "./EditorSession";

export class ScaleCommand implements Command {
    public constructor(private readonly session: EditorSession) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length !== 2) {
            throw new Error("usage: scale <id> <factor>");
        }

        const [id, factorText] = args;
        const factor = Number(factorText);

        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error("scale factor must be positive");
        }

        const shape = document.getShape(id!);
        shape.scale(factor);

        return `${shape.getLabel()} scaled by ${factor}`;
    }
}