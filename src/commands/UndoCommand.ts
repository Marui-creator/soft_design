import { Command } from "./Command";
import { CommandHistory } from "./CommandHistory";

export class UndoCommand implements Command {
    public constructor(private readonly history: CommandHistory) { }

    public execute(args: readonly string[]): string {
        if (args.length !== 0) {
            throw new Error("usage: undo");
        }

        return this.history.undo();
    }
}