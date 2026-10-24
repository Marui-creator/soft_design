import { Command } from "./Command";
import { CommandHistory } from "./CommandHistory";

export class RedoCommand implements Command {
    public constructor(private readonly history: CommandHistory) { }

    public execute(args: readonly string[]): string {
        if (args.length !== 0) {
            throw new Error("usage: redo");
        }

        return this.history.redo();
    }
}