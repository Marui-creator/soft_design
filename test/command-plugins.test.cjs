const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { default: StatsPlugin } = require("../dist/plugins/stats");
const { default: DirPlugin } = require("../dist/plugins/dir");
const { createApplication } = require("../dist/host/createApplication");
const { PluginLoader } = require("../dist/host/plugins/PluginLoader");
const { temporary } = require("./helpers/temporary.cjs");

function execute(app, name, ...args) {
    const command = app.registry.getCommands().find((item) => item.name === name);
    if (!command) throw new Error(`unknown command: ${name}`);
    return command.execute(args);
}
function state(app) {
    return { xml: app.session.getDocument().toSvgElement().toXml(),
        saved: app.session.getSavedDocument()?.toSvgElement().toXml(),
        file: app.session.getFilePath(), cwd: process.cwd() };
}
function withPlugins(directories) {
    const app = createApplication({ directories });
    const errors = [];
    const loader = new PluginLoader(app.registry, app.services, (message) => errors.push(message));
    loader.loadInstance(new StatsPlugin());
    loader.loadInstance(new DirPlugin());
    assert.deepEqual(errors, []);
    return { app, loader };
}
test("dir is usable before init and never asks the editor for a document", () => {
    const { app } = withPlugins({ currentDirectory: () => "/empty", read: () => [] });
    assert.equal(execute(app, "dir"), "(empty directory)");
    assert.throws(() => execute(app, "stats"), /no document/);
    assert.match(execute(app, "help"), /\n  stats\n  dir/);
    assert.throws(() => app.session.getDocument(), /no document/);
});

test("each plugin can be activated independently and package declarations match code declarations", () => {
    for (const [PluginClass, name, directory] of [[StatsPlugin, "stats", "stats"], [DirPlugin, "dir", "dir"]]) {
        const instance = new PluginClass();
        const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, `../src/plugins/${directory}/package.json`), "utf8"));
        assert.equal(instance.name, manifest.name);
        assert.deepEqual(instance.contributes, manifest.contributes);
        const app = createApplication();
        new PluginLoader(app.registry, app.services).loadInstance(instance);
        assert.ok(app.registry.names().commands.includes(name));
        assert.equal(app.registry.names().commands.includes(name === "stats" ? "dir" : "stats"), false);
    }
});

test("successful and failed dir and stats preserve document, saved baseline, cwd and undo/redo", (t) => {
    const directory = temporary(t);
    for (const fail of [false, true]) {
        const { app } = withPlugins({ currentDirectory: () => directory, read: () => {
            if (fail) throw new Error("EACCES");
            return [];
        } });
        execute(app, "init");
        execute(app, "create", "rect", "r1", "0", "0", "10", "10", "red");
        execute(app, "save", path.join(directory, "saved.svg"));
        const saved = state(app);
        if (fail) assert.throws(() => execute(app, "dir"), /cannot read directory/);
        else execute(app, "dir");
        assert.throws(() => execute(app, "undo"), /undo not allowed after io command/);
        execute(app, "set", "r1", "fill", "green");
        const first = state(app);
        execute(app, "set", "r1", "fill", "blue");
        const second = state(app);
        execute(app, "undo");
        const before = state(app);
        if (fail) assert.throws(() => execute(app, "dir"), /cannot read directory/);
        else assert.equal(execute(app, "dir"), "(empty directory)");
        assert.equal(execute(app, "stats"), "rect: 1  (total 1, containers 0)");
        assert.deepEqual(state(app), before);
        execute(app, "redo");
        assert.deepEqual(state(app), second);
        execute(app, "undo");
        assert.deepEqual(state(app), first);
        execute(app, "undo");
        assert.deepEqual(state(app), saved);
    }
});

test("read/save do not move dir to SVG location; both assembly modes return identical bytes", (t) => {
    const directory = temporary(t);
    const work = path.join(directory, "work");
    const external = path.join(directory, "external");
    fs.mkdirSync(work);
    fs.mkdirSync(external);
    fs.writeFileSync(path.join(work, "cwd-file.txt"), "cwd");
    const svg = path.join(external, "input.svg");
    const saved = path.join(external, "saved.svg");
    fs.writeFileSync(svg, '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect id="r1" width="2" height="3"/></svg>');
    const input = `dir\nread "${svg}"\ndir\nsave "${saved}"\ndir\n`;
    const root = path.resolve(__dirname, "..");
    const outputs = [[], ["--config", path.join(root, "plugins.config.json")]].map((args) => {
        const child = spawnSync(process.execPath, [path.join(root, "dist/main.js"), ...args], { cwd: work, input });
        assert.equal(child.status, 0, child.stderr.toString());
        const output = child.stdout.toString();
        assert.equal(output.split("[FILE]  cwd-file.txt").length - 1, 3);
        assert.doesNotMatch(output, /\[FILE\]  (input|saved)\.svg/);
        return child.stdout;
    });
    assert.deepEqual(outputs[0], outputs[1]);
});

test("disabled plugins disappear from help and report unknown commands in the real CLI", () => {
    const root = path.resolve(__dirname, "..");
    for (const args of [["--no-plugins"], ["--config", path.join(root, "plugins.disabled.config.json")]]) {
        const child = spawnSync(process.execPath, [path.join(root, "dist/main.js"), ...args], { input: "stats\ndir\nhelp\n", encoding: "utf8" });
        assert.equal(child.status, 0, child.stderr);
        assert.match(child.stdout, /error: unknown command: stats/);
        assert.match(child.stdout, /error: unknown command: dir/);
        assert.doesNotMatch(child.stdout, /\n  (stats|dir)\n/);
    }
});

test("a failing directory adapter prints the prescribed error and the CLI handles the next command", (t) => {
    const directory = temporary(t);
    const bootstrap = `const { createApplication } = require(${JSON.stringify(path.resolve(__dirname, "../dist/host/createApplication"))});
        const { PluginLoader } = require(${JSON.stringify(path.resolve(__dirname, "../dist/host/plugins/PluginLoader"))});
        const Plugin = require(${JSON.stringify(path.resolve(__dirname, "../dist/plugins/dir"))}).default;
        const app = createApplication({ directories: { currentDirectory: () => "/denied", read() { throw new Error("EACCES"); } } });
        new PluginLoader(app.registry, app.services).loadInstance(new Plugin()); app.application.run();`;
    const child = spawnSync(process.execPath, ["-e", bootstrap], { cwd: directory, input: "dir\ninit\ntree\n", encoding: "utf8" });
    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stdout, /error: cannot read directory: \/denied/);
    assert.match(child.stdout, /canvas 800x600 created/);
    assert.match(child.stdout, /svg \(800x600\)/);
});
