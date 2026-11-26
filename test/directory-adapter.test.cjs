const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { NodeDirectoryReader } = require("../dist/infrastructure/NodeDirectoryReader");
const { temporary } = require("./helpers/temporary.cjs");

test("Node directory adapter exposes cwd and direct directory entries including hidden files", (t) => {
    const directory = temporary(t);
    fs.mkdirSync(path.join(directory, "sub"));
    fs.writeFileSync(path.join(directory, "sub", "nested.txt"), "nested");
    fs.writeFileSync(path.join(directory, ".hidden"), "hidden");
    fs.writeFileSync(path.join(directory, "file.txt"), "file");
    const adapter = new NodeDirectoryReader();
    assert.equal(adapter.currentDirectory(), process.cwd());
    const entries = adapter.read(directory);
    assert.deepEqual(entries.slice().sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0), [
        { name: ".hidden", kind: "file" }, { name: "file.txt", kind: "file" }, { name: "sub", kind: "directory" },
    ]);
    assert.equal(entries.some((entry) => entry.name === "nested.txt"), false);
    assert.throws(() => adapter.read(path.join(directory, "missing")), /ENOENT/);
});
