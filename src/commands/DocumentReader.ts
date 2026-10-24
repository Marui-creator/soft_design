import { DocumentReadResult } from "./DocumentReadResult";

export interface DocumentReader {
    read(path: string): DocumentReadResult;
}