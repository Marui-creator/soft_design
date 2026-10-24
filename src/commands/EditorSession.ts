import { SvgDocument } from "../model/SvgDocument";

export class EditorSession {
    private document: SvgDocument | undefined;
    private filePath: string | undefined;

    public init(width = 800, height = 600): SvgDocument {
        const document = new SvgDocument(width, height);
        this.document = document;
        this.filePath = undefined;
        return document;
    }

    public getDocument(): SvgDocument {
        if (this.document === undefined) {
            throw new Error("no document. use 'init' or 'read' first");
        }

        return this.document;
    }

    public captureDocument(): SvgDocument {
        return this.getDocument().clone();
    }

    public restoreDocument(snapshot: SvgDocument): void {
        const restored = snapshot.clone();
        this.document = restored;
    }

    public getFilePath(): string | undefined {
        return this.filePath;
    }

    public setFilePath(path: string): void {
        this.filePath = path;
    }

    public openDocument(
        document: SvgDocument,
        path: string,
    ): void {
        this.document = document;
        this.filePath = path;
    }
}