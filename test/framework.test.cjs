const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { createApplication } = require("../dist/host/createApplication");
const { activatePlugin } = require("../dist/host/activatePlugin");
const { ExtensionRegistry } = require("../dist/core/ExtensionRegistry");
const { ShapeFactory } = require("../dist/model/ShapeFactory");
const { Shape, SvgElement } = require("../dist/core");

function execute(app, name, ...args) {
    const command = app.registry.getCommands().find((item) => item.name === name);
    if (!command) throw new Error(`unknown command: ${name}`);
    return command.execute(args);
}
function xml(app) { return app.session.getDocument().toSvgElement().toXml(); }
function install(app, contributes, activate) {
    class FixturePlugin {
        name = "fixture";
        constructor() { this.contributes = contributes; }
        activate(context, options) { return activate(context, options); }
    }
    activatePlugin(app.registry, new FixturePlugin(), { sample: true }, app.services);
}

class MarkerShape extends Shape {
    move() {}
    scale() {}
    setAttribute() { throw new Error("unsupported"); }
    describe() { return `marker#${this.getId()}`; }
    clone() { const copy = new MarkerShape(this.getId()); this.copyBaseTo(copy); return copy; }
    toSvgElement() { return this.createSvgElement("marker", {}); }
}
class MarkerProvider {
    type = "marker";
    create(args) {
        if (args.length !== 1) throw new Error("usage: create marker <id>");
        return new MarkerShape(args[0]);
    }
    canRead(element) { return element.getTag() === "marker"; }
    read(element) { return this.create([element.getAttribute("id")]); }
}
class PingCommand {
    name = "ping";
    help = "ping";
    section = "插件";
    execute(args) {
        if (args.length) throw new Error("usage: ping");
        return "pong";
    }
}
class FixedTag {
    constructor(tag) { this.tag = tag; }
    decorate() { return this.tag; }
}
class PairAttribute {
    constructor(fail = false) { this.fail = fail; }
    handles(context, attr) { return context.shape.getId() === "r1" && attr === "pair"; }
    apply(context, attr, value) {
        context.shape.setAttribute("fill", value);
        if (this.fail) throw new Error("partial update failed");
        context.document.getShape("r2").setAttribute("fill", value);
    }
}
function documentApp() {
    const app = createApplication();
    execute(app, "init");
    execute(app, "create", "rect", "r1", "0", "0", "10", "10", "red");
    execute(app, "create", "rect", "r2", "20", "0", "10", "10", "blue");
    return app;
}

test("empty registry starts without plugins, while default assembly preserves built-ins", () => {
    const registry = new ExtensionRegistry();
    assert.deepEqual(registry.names(), { shapes: [], commands: [], decorators: [], attributes: [] });
    assert.throws(() => new ShapeFactory(registry).create("rect", []), /unknown shape type/);
    const child = spawnSync(process.execPath, ["-e", 'new (require("./dist/cli/CliApplication").CliApplication)(new (require("./dist/core/ExtensionRegistry").ExtensionRegistry)()).run()'], {
        cwd: require("node:path").resolve(__dirname, ".."), input: "help\n", encoding: "utf8",
    });
    assert.equal(child.status, 0);
    assert.match(child.stdout, /error: unknown command: help/);
    const app = createApplication();
    assert.equal(app.registry.getShapes().length, 6);
    assert.equal(app.registry.getCommands().length, 19);
    assert.equal(app.registry.getDecorators().length, 0);
    assert.equal(app.registry.getAttributes().length, 0);
    assert.doesNotMatch(execute(app, "help"), /ping/);
});

test("new shape and command classes register, execute, read back and join help", () => {
    const app = createApplication();
    install(app, { shapes: ["marker"], commands: ["ping"] }, (ctx, options) => {
        assert.deepEqual(options, { sample: true });
        ctx.registerShape("marker", new MarkerProvider());
        ctx.registerCommand("ping", new PingCommand());
    });
    assert.equal(execute(app, "ping"), "pong");
    assert.match(execute(app, "help"), /插件：\n  ping/);
    assert.match(execute(app, "help"), /、marker。/);
    execute(app, "init");
    execute(app, "create", "marker", "m1");
    assert.equal(app.session.getDocument().getShape("m1").getLabel(), "marker#m1");
    const element = new SvgElement("marker");
    element.setAttribute("id", "m2");
    assert.equal(app.factory.fromSvgElement(element).getId(), "m2");
    assert.throws(() => execute(app, "ping", "unexpected"), /usage: ping/);
});

test("decorators compose in registration order and isolated app remains undecorated", () => {
    const app = documentApp();
    const before = execute(app, "tree");
    install(app, { decorators: ["first", "second"] }, (ctx) => {
        ctx.registerDecorator("first", new FixedTag("*"));
        ctx.registerDecorator("second", new FixedTag("(fixture)"));
    });
    assert.equal(execute(app, "tree"), before.split("\n").map((line) => `${line} * (fixture)`).join("\n"));
    assert.equal(execute(documentApp(), "tree"), before);
    install(app, { decorators: ["invalid"] }, (ctx) => ctx.registerDecorator("invalid", new FixedTag("bad\nline")));
    assert.throws(() => execute(app, "tree"), /invalid tree decorator result/);
});

test("attribute handler updates multiple shapes as one undo unit", () => {
    const app = documentApp();
    install(app, { attributes: ["pair"] }, (ctx) => ctx.registerAttribute("pair", new PairAttribute()));
    const before = xml(app);
    execute(app, "set", "r1", "pair", "green");
    const after = xml(app);
    assert.equal(app.session.getDocument().getShape("r2").toSvgElement().getAttribute("fill"), "green");
    execute(app, "undo");
    assert.equal(xml(app), before);
    execute(app, "redo");
    assert.equal(xml(app), after);
});

test("attribute fallback preserves whitelist, rejects unknown attrs and conflicting handlers", () => {
    const app = documentApp();
    execute(app, "set", "r1", "fill", "green");
    assert.throws(() => execute(app, "set", "r1", "label", "no"), /unknown attribute: label/);
    const before = xml(app);
    install(app, { attributes: ["pair-a", "pair-b"] }, (ctx) => {
        ctx.registerAttribute("pair-a", new PairAttribute());
        ctx.registerAttribute("pair-b", new PairAttribute());
    });
    assert.throws(() => execute(app, "set", "r1", "pair", "black"), /ambiguous attribute handler: pair/);
    assert.equal(xml(app), before);
    execute(app, "undo");
    assert.equal(app.session.getDocument().getShape("r1").toSvgElement().getAttribute("fill"), "red");
});

test("partially failing attribute restores document and both history stacks", () => {
    const app = documentApp();
    execute(app, "set", "r1", "fill", "yellow");
    const redoTarget = xml(app);
    execute(app, "undo");
    const before = xml(app);
    install(app, { attributes: ["pair"] }, (ctx) => ctx.registerAttribute("pair", new PairAttribute(true)));
    assert.throws(() => execute(app, "set", "r1", "pair", "black"), /partial update failed/);
    assert.equal(xml(app), before);
    execute(app, "redo");
    assert.equal(xml(app), redoTarget);
    execute(app, "undo");
    assert.equal(xml(app), before);
});

test("manifest mismatch and activation exception roll back every staged contribution", () => {
    for (const failure of ["manifest", "throw"]) {
        const app = createApplication();
        const before = app.registry.names();
        assert.throws(() => install(app, failure === "manifest" ? {} : { commands: ["ping"] }, (ctx) => {
            ctx.registerCommand("ping", new PingCommand());
            if (failure === "throw") throw new Error("boom");
        }), failure === "throw" ? /boom/ : /plugin manifest mismatch/);
        assert.deepEqual(app.registry.names(), before);
        install(app, { commands: ["ping"] }, (ctx) => ctx.registerCommand("ping", new PingCommand()));
        assert.equal(execute(app, "ping"), "pong");
    }
});

test("duplicates in all four categories reject current activation without touching previous plugins", () => {
    const contributions = [
        ["shapes", "registerShape", "marker", new MarkerProvider()],
        ["commands", "registerCommand", "ping", new PingCommand()],
        ["decorators", "registerDecorator", "tag", new FixedTag("*")],
        ["attributes", "registerAttribute", "pair", new PairAttribute()],
    ];
    for (const [category, method, name, value] of contributions) {
        const app = createApplication();
        install(app, { [category]: [name] }, (ctx) => ctx[method](name, value));
        const before = app.registry.names();
        assert.throws(() => install(app, {}, (ctx) => {
            ctx.registerDecorator("temporary", new FixedTag("temporary"));
            ctx[method](name, value);
        }), new RegExp(`duplicate registration: ${category}/${name}`));
        assert.deepEqual(app.registry.names(), before);
    }
});

test("closed activation context cannot register later; bad plugin objects are rejected", () => {
    const app = createApplication();
    let captured;
    install(app, {}, (ctx) => { captured = ctx; });
    assert.throws(() => captured.registerDecorator("late", new FixedTag("*")), /context is closed/);
    assert.throws(() => install(app, { shapes: ["bad"] }, (ctx) => ctx.registerShape("bad", { type: "bad" })), /invalid extension/);
});

test("shape read priorities support specialized containers and fallback, ties reject", () => {
    const app = createApplication();
    class SpecializedProvider extends MarkerProvider {
        type = "special";
        readPriority = 10;
        canRead(element) { return element.getTag() === "g" && element.getAttribute("data-kind") === "special"; }
    }
    const element = new SvgElement("g");
    element.setAttribute("id", "s1");
    element.setAttribute("data-kind", "special");
    assert.equal(app.factory.fromSvgElement(element).getLabel(), "g#s1");
    install(app, { shapes: ["special"] }, (ctx) => ctx.registerShape("special", new SpecializedProvider()));
    assert.equal(app.factory.fromSvgElement(element).getLabel(), "marker#s1");
    class OtherProvider extends SpecializedProvider { type = "other"; }
    install(app, { shapes: ["other"] }, (ctx) => ctx.registerShape("other", new OtherProvider()));
    assert.throws(() => app.factory.fromSvgElement(element), /ambiguous shape provider/);
});

test("saved baseline is isolated from undo snapshots and returned as a defensive copy", () => {
    const app = documentApp();
    assert.equal(app.session.getSavedDocument(), undefined);
    app.session.setFilePath("fixture.svg");
    const saved = app.session.getSavedDocument().toSvgElement().toXml();
    app.session.getSavedDocument().resize(1, 1);
    execute(app, "set", "r1", "fill", "green");
    assert.equal(app.session.getSavedDocument().toSvgElement().toXml(), saved);
    execute(app, "undo");
    assert.equal(xml(app), saved);
});
