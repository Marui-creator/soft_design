import { Command } from "./Command";
import { EditorSession } from "./EditorSession";
import { CommandHistory } from "./CommandHistory";

export class CanvasCommand implements Command {
    public constructor(
        private readonly session: EditorSession,
        private readonly history: CommandHistory,
    ) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length === 0) {
            return `canvas ${document.getWidth()}x${document.getHeight()}`;
        }

        if (args.length !== 2) {
            throw new Error("usage: canvas [w h]");
        }

        document.resize(Number(args[0]), Number(args[1]));
        this.history.blockAfterIo();

        return `canvas resized to ${document.getWidth()}x${document.getHeight()}`;
    }
}