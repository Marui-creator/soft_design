import { Command } from "../../../core";
import { CommandHistory } from "../../../core";
import { DocumentWriter } from "../../../core";
import { EditorSession } from "../../../core";

export class SaveCommand implements Command {
    public constructor(
        private readonly session: EditorSession,
        private readonly writer: DocumentWriter,
        private readonly history: CommandHistory,
    ) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length > 1) {
            throw new Error("usage: save [file.svg]");
        }

        const path = args[0] ?? this.session.getFilePath();

        if (path === undefined || path.trim().length === 0) {
            throw new Error("no file path. use 'save <file.svg>'");
        }

        this.writer.write(path, document);

        // 只有保存成功，才更新路径和历史限制。
        this.session.setFilePath(path);
        this.history.blockAfterIo();

        return `saved to ${path}`;
    }
}