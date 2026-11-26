const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { temporary } = require("./helpers/temporary.cjs");

test("root config alone loads box package and replays the exact Phase 1 version B session", (t) => {
    const cwd = temporary(t);
    const root = path.resolve(__dirname, "..");
    const child = spawnSync(process.execPath, [path.join(root, "dist/main.js"), "--config", path.join(root, "plugins.config.json")], {
        cwd, input: fs.readFileSync(path.join(root, "doc/transcript/cli-box.txt")),
    });
    assert.equal(child.status, 0, child.stderr.toString());
    assert.equal(child.stderr.length, 0);
    assert.deepEqual(child.stdout, fs.readFileSync(path.join(root, "doc/transcript/expected/assembly/cli-box.stdout.txt")));
    const saved = fs.readFileSync(path.join(cwd, "flowchart-box.svg"), "utf8");
    assert.equal((saved.match(/data-kind="box"/g) ?? []).length, 2);
    assert.match(saved, /id="n2-rect"[^>]*fill="#f5a623"/);
    assert.match(saved, /处理数据<\/text>/);
});
