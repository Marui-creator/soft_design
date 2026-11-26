const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createApplication } = require("../dist/host/createApplication");
const { PluginLoader } = require("../dist/host/plugins/PluginLoader");
const { default: BoxPlugin } = require("../dist/plugins/box");
const { default: TreeStarPlugin } = require("../dist/plugins/tree-star");
const { temporary } = require("./helpers/temporary.cjs");

function execute(app, name, ...args) {
    const command = app.registry.getCommands().find((item) => item.name === name);
    if (!command) throw new Error(`unknown command: ${name}`);
    return command.execute(args);
}
function setup(reverse = false) {
    const app = createApplication(); const errors = [];
    const loader = new PluginLoader(app.registry, app.services, (error) => errors.push(error));
    for (const plugin of reverse ? [new TreeStarPlugin(), new BoxPlugin()] : [new BoxPlugin(), new TreeStarPlugin()]) loader.loadInstance(plugin);
    assert.deepEqual(errors, []);
    execute(app, "init"); execute(app, "create", "g", "flow");
    execute(app, "create", "box", "n1", "120", "100", "160", "60", "开始", "in", "flow");
    return app;
}
function row(tree, id) { return tree.split("\n").find((line) => line.includes(`#${id} `)); }
function isDirty(tree, id) { const line = id === undefined ? tree.split("\n")[0] : row(tree, id); assert.ok(line); return line.endsWith("*"); }

test("real edit/save/edit/undo/redo state machine keeps box label and ancestor propagation", (t) => {
    const app = setup(); const file = path.join(temporary(t), "saved.svg");
    let tree = execute(app, "tree");
    assert.match(row(tree, "n1"), /\(box\) \*$/);
    for (const id of [undefined, "flow", "n1", "n1-rect", "n1-label"]) assert.equal(isDirty(tree, id), true);
    execute(app, "set", "n1", "label", "编辑后保存");
    execute(app, "save", file);
    const savedTree = execute(app, "tree");
    assert.equal(savedTree.includes("*"), false);
    assert.match(row(savedTree, "n1"), /\(box\)$/);
    execute(app, "set", "n1", "fill", "orange"); tree = execute(app, "tree");
    for (const id of [undefined, "flow", "n1", "n1-rect"]) assert.equal(isDirty(tree, id), true);
    assert.equal(isDirty(tree, "n1-label"), false);
    execute(app, "undo"); assert.equal(execute(app, "tree"), savedTree);
    execute(app, "redo"); assert.equal(execute(app, "tree"), tree);
    execute(app, "save", file); assert.equal(execute(app, "tree").includes("*"), false);
    execute(app, "set", "n1", "label", "再编辑"); tree = execute(app, "tree");
    assert.equal(isDirty(tree, "n1-label"), true); assert.equal(isDirty(tree, "n1-rect"), false);
    execute(app, "undo"); assert.equal(execute(app, "tree").includes("*"), false);
});

test("failed edit/save/read preserve dirty state, successful read resets baseline and init discards it", (t) => {
    const app = setup(); const directory = temporary(t); const file = path.join(directory, "saved.svg");
    execute(app, "save", file);
    assert.throws(() => execute(app, "delete", "n1-rect"), /cannot detach required/);
    assert.equal(execute(app, "tree").includes("*"), false);
    execute(app, "set", "n1", "label", "changed");
    const dirty = execute(app, "tree");
    assert.throws(() => execute(app, "save", path.join(directory, "missing", "output.svg")), /cannot write file/);
    assert.equal(execute(app, "tree"), dirty);
    fs.writeFileSync(path.join(directory, "invalid.svg"), "<svg>");
    assert.throws(() => execute(app, "read", path.join(directory, "invalid.svg")), /invalid or unsupported SVG XML/);
    assert.equal(execute(app, "tree"), dirty);
    execute(app, "read", file);
    assert.equal(execute(app, "tree").includes("*"), false);
    execute(app, "init"); assert.equal(execute(app, "tree"), "svg (800x600) *");
});

test("new/deleted/reparented nodes mark affected ancestors while tree queries leave history intact", (t) => {
    const app = setup(); const file = path.join(temporary(t), "saved.svg");
    execute(app, "create", "g", "other"); execute(app, "save", file);
    const clean = execute(app, "tree");
    execute(app, "create", "text", "extra", "0", "0", "extra", "in", "n1");
    const added = execute(app, "tree"); assert.equal(isDirty(added, "extra"), true);
    assert.equal(isDirty(added, "n1"), true); assert.equal(isDirty(added, "n1-rect"), false);
    execute(app, "undo"); assert.equal(execute(app, "tree"), clean);
    execute(app, "redo"); assert.equal(execute(app, "tree"), added);
    execute(app, "undo"); execute(app, "addto", "other", "n1");
    const moved = execute(app, "tree");
    for (const id of [undefined, "flow", "other", "n1"]) assert.equal(isDirty(moved, id), true);
    assert.equal(isDirty(moved, "n1-rect"), false);
    execute(app, "undo"); assert.equal(execute(app, "tree"), clean);
    execute(app, "delete", "n1"); assert.equal(isDirty(execute(app, "tree"), "flow"), true);
    execute(app, "undo"); assert.equal(execute(app, "tree"), clean);
});

test("independent labels follow registration order without changing each other's behavior", () => {
    const ordinary = execute(setup(), "tree");
    const reversed = execute(setup(true), "tree");
    assert.match(row(ordinary, "n1"), /\(box\) \*$/);
    assert.match(row(reversed, "n1"), /\* \(box\)$/);
    assert.equal(ordinary.replace("(box) *", "* (box)"), reversed);
    const instance = new TreeStarPlugin();
    const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/plugins/tree-star/package.json"), "utf8"));
    assert.equal(instance.name, manifest.name); assert.deepEqual(instance.contributes, manifest.contributes);
});

test("disabling only modified-star preserves the previous box transcript byte for byte", (t) => {
    const root = path.resolve(__dirname, "..");
    const result = spawnSync(process.execPath, [path.join(root, "dist/main.js"), "--config", path.join(root, "plugins.box.config.json")], {
        cwd: temporary(t), input: fs.readFileSync(path.join(root, "doc/transcript/cli-box.txt")),
    });
    assert.equal(result.status, 0, result.stderr.toString());
    assert.deepEqual(result.stdout, fs.readFileSync(path.join(root, "doc/transcript/expected/no-star/cli-box.stdout.txt")));
    assert.match(result.stdout.toString(), /\(box\)/);
    assert.doesNotMatch(result.stdout.toString(), / \*\n/);
});
