const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { createApplication } = require("../dist/host/createApplication");
const { PluginLoader } = require("../dist/host/plugins/PluginLoader");
const { temporary } = require("./helpers/temporary.cjs");

const ping = `exports.default = class {
    activate(ctx, options) {
        ctx.registerCommand("ping", new class {
            name = "ping"; help = "ping"; section = "插件";
            execute() { return JSON.stringify(options ?? "pong"); }
        });
    }
};`;
function packageAt(directory, name, source, contributes = {}, extra = {}) {
    const target = path.join(directory, name);
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, "package.json"), JSON.stringify({ name, type: "commonjs", main: "index.cjs", contributes, ...extra }));
    fs.writeFileSync(path.join(target, "index.cjs"), source);
    return target;
}
function fixture(test) {
    const directory = temporary(test);
    const app = createApplication();
    const errors = [];
    return { directory, app, errors, loader: new PluginLoader(app.registry, app.services, (line) => errors.push(line)) };
}
function config(directory, plugins) {
    const filename = path.join(directory, "plugins.config.json");
    fs.writeFileSync(filename, JSON.stringify({ plugins }));
    return filename;
}

test("four loader failure paths report exact prefixes, roll back and continue", (t) => {
    const { directory, app, loader, errors } = fixture(t);
    packageAt(directory, "no-default", "exports.value = 1;");
    packageAt(directory, "mismatch", ping, { commands: ["different"] });
    packageAt(directory, "throws", 'exports.default = class { activate(ctx) { ctx.registerDecorator("temp", new class { decorate() { return "*"; } }); throw new Error("boom"); } };', { decorators: ["temp"] });
    packageAt(directory, "good", ping, { commands: ["ping"] });
    assert.equal(loader.loadConfig(config(directory, [
        { module: "./missing" }, { module: "./no-default" }, { module: "./mismatch" },
        { module: "./throws" }, { module: "./good", options: { label: "选项" } },
    ])), true);
    assert.equal(errors.length, 4);
    assert.equal(errors[0], "error: plugin not found: ./missing");
    assert.equal(errors[1], "error: plugin has no default export: ./no-default");
    assert.equal(errors[2], "error: plugin manifest mismatch: mismatch (declared: commands=different, registered: commands=ping)");
    assert.equal(errors[3], "error: plugin failed to activate: throws (boom)");
    assert.equal(app.registry.getDecorators().length, 0);
    assert.equal(app.registry.getCommands().find((cmd) => cmd.name === "ping").execute([]), '{"label":"选项"}');
});

test("duplicate registration discards earlier staged entries and preserves successful plugins", (t) => {
    const { directory, app, loader, errors } = fixture(t);
    packageAt(directory, "good", ping, { commands: ["ping"] });
    packageAt(directory, "duplicate", `exports.default = class { activate(ctx) {
        ctx.registerDecorator("temporary", new class { decorate() { return "*"; } });
        ctx.registerCommand("ping", new class { name = "ping"; help = "ping"; section = "插件"; execute() { return "wrong"; } });
    } };`, { decorators: ["temporary"], commands: ["ping"] });
    packageAt(directory, "later", 'exports.default = class { activate(ctx) { ctx.registerDecorator("later", new class { decorate() { return "ok"; } }); } };', { decorators: ["later"] });
    loader.loadConfig(config(directory, [{ module: "./good" }, { module: "./duplicate" }, { module: "./later" }]));
    assert.deepEqual(errors, ["error: duplicate registration: commands/ping"]);
    assert.deepEqual(app.registry.names().decorators, ["later"]);
    assert.equal(app.registry.getCommands().find((cmd) => cmd.name === "ping").execute([]), '"pong"');
});

test("configuration validation is atomic and keeps only default built-ins", (t) => {
    const { directory, app, loader, errors } = fixture(t);
    const filename = path.join(directory, "plugins.config.json");
    packageAt(directory, "good", ping, { commands: ["ping"] });
    const invalid = ["{", "null", "[]", "{}", '{"plugins":{}}',
        JSON.stringify({ plugins: [{ module: "./good" }, { module: "" }] }),
        JSON.stringify({ plugins: [{ module: "./good", enabled: "false" }] }),
        JSON.stringify({ plugins: [null] })];
    for (const source of invalid) {
        fs.writeFileSync(filename, source);
        assert.equal(loader.loadConfig(filename), false);
        assert.equal(app.registry.getCommands().length, 19);
    }
    assert.equal(loader.loadConfig(path.join(directory, "absent.json")), false);
    assert.equal(errors.length, invalid.length + 1);
    assert.ok(errors.every((error) => error === "error: invalid plugin config"));
});

test("relative modules use config directory; disabled modules do not resolve or evaluate", (t) => {
    const { directory, app, loader, errors } = fixture(t);
    const nested = path.join(directory, "nested");
    fs.mkdirSync(nested);
    packageAt(directory, "good", ping, { commands: ["ping"] });
    packageAt(directory, "disabled", 'throw new Error("must not evaluate");');
    loader.loadConfig(config(nested, [
        { module: "../disabled", enabled: false }, { module: "./missing", enabled: false },
        { module: "../good" },
    ]));
    assert.deepEqual(errors, []);
    assert.ok(app.registry.names().commands.includes("ping"));
});

test("package-name resolution follows node_modules and package manifests", (t) => {
    const { directory, app, loader, errors } = fixture(t);
    packageAt(path.join(directory, "node_modules"), "@fixture/ping", ping, { commands: ["ping"] });
    loader.loadConfig(config(directory, [{ module: "@fixture/ping" }]));
    assert.deepEqual(errors, []);
    assert.ok(app.registry.names().commands.includes("ping"));
});

test("dependencies and module evaluation errors are not misreported as missing top-level plugin", (t) => {
    const { directory, loader, errors } = fixture(t);
    packageAt(directory, "dependency", 'require("./missing-dependency.cjs"); exports.default = class { activate() {} };');
    packageAt(directory, "syntax", "exports.default = ;");
    packageAt(directory, "constructor", 'exports.default = class { constructor() { throw new Error("constructor boom"); } };');
    loader.loadConfig(config(directory, [{ module: "./dependency" }, { module: "./syntax" }, { module: "./constructor" }]));
    assert.equal(errors.length, 3);
    assert.match(errors[0], /^error: plugin failed to activate: dependency \(Cannot find module/);
    assert.match(errors[1], /^error: plugin failed to activate: syntax /);
    assert.equal(errors[2], "error: plugin failed to activate: constructor (constructor boom)");
    assert.ok(errors.every((error) => !error.startsWith("error: plugin not found:")));
});

test("contributes categories are validated and package declaration is authoritative", (t) => {
    const { directory, app, loader, errors } = fixture(t);
    packageAt(directory, "invalid", ping, { commands: "ping" });
    packageAt(directory, "unknown-category", ping, { unsupported: [] });
    packageAt(directory, "duplicate-manifest", ping, { commands: ["ping", "ping"] });
    packageAt(directory, "lies", 'exports.default = class { contributes = { commands: [] }; activate(ctx) { ctx.registerCommand("ping", new class { name = "ping"; help = "ping"; section = "插件"; execute() { return "pong"; } }); } };', {});
    loader.loadConfig(config(directory, ["invalid", "unknown-category", "duplicate-manifest", "lies"].map((name) => ({ module: `./${name}` }))));
    assert.equal(errors.length, 4);
    assert.ok(errors[0].includes("invalid plugin manifest"));
    assert.ok(errors[1].includes("invalid plugin manifest"));
    assert.match(errors[2], /^error: plugin manifest mismatch:/);
    assert.match(errors[3], /^error: plugin manifest mismatch:/);
    assert.equal(app.registry.getCommands().length, 19);
});

test("invalid config and activation errors keep CLI process alive and usable", (t) => {
    const directory = temporary(t);
    const bad = path.join(directory, "bad.json");
    fs.writeFileSync(bad, "{");
    const child = spawnSync(process.execPath, [path.resolve(__dirname, "../dist/main.js"), "--config", bad], {
        cwd: directory, input: "init\ntree\n", encoding: "utf8",
    });
    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stdout, /^error: invalid plugin config\nsvg-editor/);
    assert.match(child.stdout, /canvas 800x600 created/);
    assert.match(child.stdout, /svg \(800x600\)/);
    packageAt(directory, "throws", 'exports.default = class { activate() { throw new Error("boom"); } };');
    const failing = spawnSync(process.execPath, [path.resolve(__dirname, "../dist/main.js"), "--config", config(directory, [{ module: "./throws" }])], {
        cwd: directory, input: "init\ntree\n", encoding: "utf8",
    });
    assert.equal(failing.status, 0, failing.stderr);
    assert.match(failing.stdout, /^error: plugin failed to activate: throws \(boom\)/);
    assert.match(failing.stdout, /svg \(800x600\)/);
});
