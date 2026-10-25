import { writeFileSync } from "node:fs";
import { DocumentWriter } from "../commands/DocumentWriter";
import { SvgDocument } from "../model/SvgDocument";

export class SvgFileWriter implements DocumentWriter {
    public write(path: string, document: SvgDocument): void {
        const xml =
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            document.toSvgElement().toXml() +
            "\n";

        try {
            writeFileSync(path, xml, "utf8");
        } catch {
            throw new Error(`cannot write file: ${path}`);
        }
    }
}