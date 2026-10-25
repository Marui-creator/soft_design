import { readFileSync } from "node:fs";
import { DocumentReader } from "../commands/DocumentReader";
import { DocumentReadResult } from "../commands/DocumentReadResult";
import { SvgXmlParser } from "./SvgXmlParser";

export class SvgFileReader implements DocumentReader {
    public constructor(private readonly parser: SvgXmlParser) { }

    public read(path: string): DocumentReadResult {
        let xml: string;

        try {
            xml = readFileSync(path, "utf8");
        } catch {
            throw new Error(`cannot read file: ${path}`);
        }

        return this.parser.parse(xml);
    }
}