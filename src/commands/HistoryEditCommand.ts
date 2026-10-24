import { Command } from "./Command";
import { CommandHistory } from "./CommandHistory";

export class HistoryEditCommand implements Command {
    public constructor(
        private readonly command: Command,
        private readonly history: CommandHistory,
    ) { }

    public execute(args: readonly string[]): string {
        return this.history.executeEdit(this.command, args);
    }
}