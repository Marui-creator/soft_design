import { SvgDocument } from "../model/SvgDocument";

export interface DocumentWriter {
    write(path: string, document: SvgDocument): void;
}