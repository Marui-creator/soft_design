/** 插件需要的目录语义；不暴露 Node 的 Dirent 或 fs API。 */
export interface DirectoryEntry {
    readonly name: string;
    readonly kind: "directory" | "file" | "link" | "other";
}

export interface DirectoryReader {
    currentDirectory(): string;
    read(path: string): readonly DirectoryEntry[];
}
