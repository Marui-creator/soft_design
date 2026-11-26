const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DirCommand, default: DirPlugin } = require("../dist/plugins/dir");
const { NodeDirectoryReader } = require("../dist/infrastructure/NodeDirectoryReader");
const { temporary } = require("./helpers/temporary.cjs");

test("dir stub: mixed entries, hidden items, dot filtering, stable sorting and two-space separators", () => {
    const entries = Object.freeze([
        { name: "z.txt", kind: "file" }, { name: "plugins", kind: "directory" },
        { name: ".hidden", kind: "file" }, { name: "docs", kind: "directory" },
        { name: "A.txt", kind: "file" }, { name: "a.txt", kind: "file" },
        { name: "symlink", kind: "link" }, { name: "socket", kind: "other" },
        { name: ".", kind: "directory" }, { name: "..", kind: "directory" },
    ]);
    let call = 0;
    const command = new DirCommand({ currentDirectory: () => "/fixed", read: (directory) => {
        assert.equal(directory, "/fixed");
        return call++ % 2 === 0 ? entries : entries.slice().reverse();
    } });
    const expected = "[DIR]  docs\n[DIR]  plugins\n[FILE]  .hidden\n[FILE]  A.txt\n[FILE]  a.txt\n[FILE]  z.txt\n[LINK]  symlink\n[OTHER]  socket";
    assert.equal(command.execute([]), expected);
    assert.equal(command.execute([]), expected);
    assert.equal(entries[0].name, "z.txt");
    assert.throws(() => command.execute(["somewhere"]), /usage: dir/);
});

test("dir stub: empty directory and failure use specified text", () => {
    assert.equal(new DirCommand({ currentDirectory: () => "/fixed", read: () => [] }).execute([]), "(empty directory)");
    const command = new DirCommand({ currentDirectory: () => "/denied", read: () => { throw new Error("EACCES"); } });
    assert.throws(() => command.execute([]), { message: "cannot read directory: /denied" });
});

test("dir and real adapter combine without recursively listing nested files", (t) => {
    const directory = temporary(t);
    fs.mkdirSync(path.join(directory, "sub"));
    fs.writeFileSync(path.join(directory, "sub", "nested.txt"), "nested");
    fs.writeFileSync(path.join(directory, ".hidden"), "hidden");
    fs.writeFileSync(path.join(directory, "visible.txt"), "visible");
    class FixedCwdAdapter extends NodeDirectoryReader { currentDirectory() { return directory; } }
    assert.equal(new DirCommand(new FixedCwdAdapter()).execute([]), "[DIR]  sub\n[FILE]  .hidden\n[FILE]  visible.txt");
});

test("dir plugin activates with only a directory interface and no editor or other plugins", () => {
    const contributions = [];
    new DirPlugin().activate({
        directories: { currentDirectory: () => "/empty", read: () => [] },
        registerCommand: (name, command) => contributions.push([name, command]),
    });
    assert.equal(contributions.length, 1);
    assert.equal(contributions[0][0], "dir");
    assert.equal(contributions[0][1].execute([]), "(empty directory)");
});
