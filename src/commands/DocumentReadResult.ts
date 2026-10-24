import { SvgDocument } from "../model/SvgDocument";

export class DocumentReadResult {
    private readonly warnings: readonly string[];

    public constructor(
        private readonly document: SvgDocument,
        warnings: readonly string[],
    ) {
        this.warnings = [...warnings];
    }

    public getDocument(): SvgDocument {
        return this.document;
    }

    public getWarnings(): readonly string[] {
        return [...this.warnings];
    }
}