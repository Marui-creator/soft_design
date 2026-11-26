import { readdirSync } from "node:fs";
import type { DirectoryEntry, DirectoryReader } from "../core/DirectoryReader";

/** Adapter：将 Node 文件系统的 Dirent 转为应用定义的 DirectoryEntry。 */
export class NodeDirectoryReader implements DirectoryReader {
    public currentDirectory(): string { return process.cwd(); }

    public read(path: string): readonly DirectoryEntry[] {
        return readdirSync(path, { withFileTypes: true }).map((entry) => ({
            name: entry.name,
            kind: entry.isSymbolicLink() ? "link" : entry.isDirectory() ? "directory" :
                entry.isFile() ? "file" : "other",
        }));
    }
}
