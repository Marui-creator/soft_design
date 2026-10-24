import { Command } from "./Command";
import { EditorSession } from "./EditorSession";
import { SvgDocument } from "../model/SvgDocument";

export class CommandHistory {
    private readonly undoStack: SvgDocument[] = [];
    private readonly redoStack: SvgDocument[] = [];
    private blockedByIo = false;

    public constructor(private readonly session: EditorSession) { }

    public executeEdit(
        command: Command,
        args: readonly string[],
    ): string {
        const before = this.session.captureDocument();

        let result: string;

        try {
            result = command.execute(args);
        } catch (error: unknown) {
            this.session.restoreDocument(before);
            throw error;
        }

        this.undoStack.push(before);
        this.redoStack.length = 0;
        this.blockedByIo = false;

        return result;
    }

    public undo(): string {
        this.checkAllowed();

        const previous = this.undoStack[this.undoStack.length - 1];

        if (previous === undefined) {
            throw new Error("nothing to undo");
        }

        const current = this.session.captureDocument();
        this.session.restoreDocument(previous);

        this.undoStack.pop();
        this.redoStack.push(current);

        return "edit undone";
    }

    public redo(): string {
        this.checkAllowed();

        const next = this.redoStack[this.redoStack.length - 1];

        if (next === undefined) {
            throw new Error("nothing to redo");
        }

        const current = this.session.captureDocument();
        this.session.restoreDocument(next);

        this.redoStack.pop();
        this.undoStack.push(current);

        return "edit redone";
    }

    public blockAfterIo(): void {
        this.undoStack.length = 0;
        this.redoStack.length = 0;
        this.blockedByIo = true;
    }

    private checkAllowed(): void {
        this.session.getDocument();

        if (this.blockedByIo) {
            throw new Error("undo not allowed after io command");
        }
    }
}