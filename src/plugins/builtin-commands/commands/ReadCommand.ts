import { Command } from "../../../core";
import { CommandHistory } from "../../../core";
import { DocumentReader } from "../../../core";
import { EditorSession } from "../../../core";

export class ReadCommand implements Command {
    public constructor(
        private readonly session: EditorSession,
        private readonly reader: DocumentReader,
        private readonly history: CommandHistory,
    ) { }

    public execute(args: readonly string[]): string {
        if (args.length !== 1 || args[0]!.trim().length === 0) {
            throw new Error("usage: read <file.svg>");
        }

        const path = args[0]!;
        const result = this.reader.read(path);

        // 完整读取成功后，才替换当前文档并更新历史限制。
        this.session.openDocument(result.getDocument(), path);
        this.history.blockAfterIo();

        return [
            ...result.getWarnings(),
            `read ${path}`,
        ].join("\n");
    }
}