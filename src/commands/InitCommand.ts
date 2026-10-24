import { Command } from "./Command";
import { EditorSession } from "./EditorSession";
import { CommandHistory } from "./CommandHistory";

export class InitCommand implements Command {
    public constructor(
        private readonly session: EditorSession,
        private readonly history: CommandHistory,
    ) { }

    public execute(args: readonly string[]): string {
        if (args.length > 2) {
            throw new Error("usage: init [w] [h]");
        }

        const width = args[0] === undefined ? 800 : Number(args[0]);
        const height = args[1] === undefined ? 600 : Number(args[1]);

        const document = this.session.init(width, height);
        this.history.blockAfterIo();

        return `canvas ${document.getWidth()}x${document.getHeight()} created`;
    }
}