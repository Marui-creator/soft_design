const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createApplication } = require("../dist/host/createApplication");
const { PluginLoader } = require("../dist/host/plugins/PluginLoader");
const { default: BoxPlugin, BoxShape } = require("../dist/plugins/box");
const { default: StatsPlugin } = require("../dist/plugins/stats");
const { SvgXmlParser } = require("../dist/infrastructure/SvgXmlParser");
const { DOMParser } = require("@xmldom/xmldom");
const { temporary } = require("./helpers/temporary.cjs");

function execute(app, name, ...args) {
    const command = app.registry.getCommands().find((item) => item.name === name);
    if (!command) throw new Error(`unknown command: ${name}`);
    return command.execute(args);
}
function setup() {
    const app = createApplication();
    const errors = [];
    const loader = new PluginLoader(app.registry, app.services, (error) => errors.push(error));
    loader.loadInstance(new BoxPlugin());
    assert.deepEqual(errors, []);
    execute(app, "init");
    return app;
}
function createBox(app, id = "n1", parent) {
    return execute(app, "create", "box", id, "120", "100", "160", "60", "开始", ...(parent ? ["in", parent] : []));
}
function state(app) {
    return { xml: app.session.getDocument().toSvgElement().toXml(), file: app.session.getFilePath(),
        saved: app.session.getSavedDocument()?.toSvgElement().toXml() };
}
function shape(app, id) { return app.session.getDocument().getShape(id); }
function xmlTree(xml) {
    const root = new DOMParser().parseFromString(xml, "application/xml").documentElement;
    function visit(element) {
        const attributes = Array.from(element.attributes).map((attribute) => [attribute.name, attribute.value]);
        attributes.sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0);
        return { tag: element.tagName, attributes, children: Array.from(element.childNodes).map((node) =>
            node.nodeType === 1 ? visit(node) : { text: node.nodeValue }) };
    }
    return visit(root);
}

test("box fill and label each form one undo unit and retain plugin type after redo", () => {
    const app = setup(); createBox(app);
    const initial = state(app);
    execute(app, "set", "n1", "fill", "#f5a623");
    assert.equal(shape(app, "n1-rect").toSvgElement().getAttribute("fill"), "#f5a623");
    const filled = state(app);
    execute(app, "undo"); assert.deepEqual(state(app), initial);
    execute(app, "redo"); assert.deepEqual(state(app), filled);
    execute(app, "set", "n1", "label", "处理数据 v2");
    assert.equal(shape(app, "n1-label").toSvgElement().getText(), "处理数据 v2");
    const labeled = state(app);
    execute(app, "undo"); assert.deepEqual(state(app), filled);
    execute(app, "redo"); assert.deepEqual(state(app), labeled);
    assert.ok(shape(app, "n1") instanceof BoxShape);
    assert.match(execute(app, "tree"), /g#n1 children=2 \(box\)/);
    execute(app, "set", "n1", "stroke-width", "2");
    execute(app, "set", "n1", "stroke", "black");
    const styles = state(app);
    execute(app, "set", "n1", "label", "new");
    execute(app, "undo"); assert.deepEqual(state(app), styles);
});

test("nested boxes move, scale, group, delete and restore as complete composite subtrees", () => {
    const app = setup(); execute(app, "create", "g", "outer"); createBox(app, "n1", "outer"); createBox(app, "n2", "n1");
    const before = state(app);
    execute(app, "move", "n1", "10", "20");
    assert.equal(shape(app, "n1-rect").toSvgElement().getAttribute("x"), "130");
    assert.equal(shape(app, "n2-label").toSvgElement().getAttribute("y"), "155");
    execute(app, "undo"); assert.deepEqual(state(app), before);
    execute(app, "redo");
    execute(app, "scale", "n1", "2");
    assert.equal(shape(app, "n2-rect").toSvgElement().getAttribute("x"), "260");
    execute(app, "group", "cluster", "n1");
    assert.equal(shape(app, "n1").getParentId(), "cluster");
    assert.match(execute(app, "show", "n1"), /parent=g#cluster/);
    const grouped = state(app);
    execute(app, "delete", "n1");
    for (const id of ["n1", "n1-rect", "n1-label", "n2", "n2-rect", "n2-label"]) assert.throws(() => shape(app, id), /no such shape/);
    execute(app, "undo"); assert.deepEqual(state(app), grouped);
    assert.ok(shape(app, "n2") instanceof BoxShape);
    execute(app, "redo"); assert.throws(() => shape(app, "n1"), /no such shape/);
});

test("all incoming subtree IDs are checked before insertion and failure preserves redo history", () => {
    for (const conflict of ["n1", "n1-rect", "n1-label"]) {
        const app = setup();
        execute(app, "create", "rect", conflict, "0", "0", "10", "10", "red");
        execute(app, "set", conflict, "fill", "blue"); const redo = state(app);
        execute(app, "undo"); const before = state(app);
        assert.throws(() => createBox(app), new RegExp(`id already exists: ${conflict}`));
        assert.deepEqual(state(app), before);
        execute(app, "redo"); assert.deepEqual(state(app), redo);
    }
});

test("ordinary delete, addto, group, front/back and ungroup cannot dismantle required parts", () => {
    const operations = [
        ["delete", "n1-rect"], ["delete", "n1-label"], ["addto", "outer", "n1-rect"],
        ["group", "stolen", "extra", "n1-label"], ["front", "n1-rect"], ["back", "n1-label"],
    ];
    for (const [command, ...args] of operations) {
        const app = setup(); execute(app, "create", "g", "outer"); createBox(app, "n1", "outer");
        execute(app, "create", "rect", "extra", "0", "0", "10", "10");
        execute(app, "set", "n1", "label", "redo title"); const redo = state(app);
        execute(app, "undo"); const before = state(app);
        assert.throws(() => execute(app, command, ...args), /cannot detach required box part/);
        assert.deepEqual(state(app), before);
        execute(app, "redo"); assert.deepEqual(state(app), redo);
    }
    const app = setup(); createBox(app);
    assert.throws(() => execute(app, "ungroup", "n1"), { message: "cannot ungroup composite shape: n1" });
    execute(app, "create", "text", "extra", "0", "0", "extra", "in", "n1");
    execute(app, "delete", "extra");
    assert.equal(shape(app, "n1").getChildren().length, 2);
});

test("installed box round-trip retains nested type, styles, transforms and editing", (t) => {
    const directory = temporary(t); const file = path.join(directory, "boxes.svg");
    const app = setup(); createBox(app); createBox(app, "n2", "n1");
    shape(app, "n1").setTransform("translate(3 4)");
    execute(app, "set", "n1", "stroke-width", "2"); execute(app, "set", "n1", "stroke", "black");
    execute(app, "set", "n2", "label", "标题 & <内容>");
    execute(app, "save", file); const before = state(app);
    assert.match(fs.readFileSync(file, "utf8"), /data-kind="box"/);
    execute(app, "read", file);
    const after = state(app);
    assert.equal(after.file, before.file);
    assert.equal(after.saved, after.xml);
    // XML attribute order is not semantic; the established parser canonicalizes style order.
    assert.deepEqual(xmlTree(after.xml), xmlTree(before.xml));
    assert.ok(shape(app, "n1") instanceof BoxShape); assert.ok(shape(app, "n2") instanceof BoxShape);
    assert.equal(shape(app, "n1").getTransform(), "translate(3 4)");
    execute(app, "set", "n2", "label", "edited"); execute(app, "undo");
    assert.equal(shape(app, "n2-label").toSvgElement().getText(), "标题 & <内容>");
});

test("without box plugin serialized box degrades to ordinary group with all children intact", () => {
    const app = setup(); createBox(app); createBox(app, "n2", "n1");
    const ordinary = createApplication();
    const document = new SvgXmlParser(ordinary.factory).parse(state(app).xml).getDocument();
    const group = document.getShape("n1");
    assert.equal(group instanceof BoxShape, false);
    assert.equal(group.isContainer(), true);
    assert.equal(group.getChildren().length, 3);
    assert.equal(document.getShape("n2-rect").toSvgElement().getAttribute("fill"), "#4a90d9");
    assert.throws(() => group.setAttribute("label", "not installed"), /unknown attribute: label/);
});

test("damaged box or duplicate IDs reject the whole read without changing document or history", (t) => {
    const directory = temporary(t);
    const children = [
        '<rect id="n1-rect" width="10" height="10"/>',
        '<circle id="n1-rect" r="10"/><text id="n1-label">title</text>',
        '<rect id="wrong"/><text id="n1-label">title</text>',
        '<rect id="n1-rect"/><g id="n1-label"/>',
        '<rect id="n1-rect"/><text id="n1-label"/><circle id="n1-rect"/>',
    ];
    for (let index = 0; index < children.length; index++) {
        const app = setup(); createBox(app, "keep");
        execute(app, "set", "keep", "label", "redo title"); const redo = state(app);
        execute(app, "undo"); const before = state(app);
        const file = path.join(directory, `broken-${index}.svg`);
        fs.writeFileSync(file, `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><g id="n1" data-kind="box">${children[index]}</g></svg>`);
        assert.throws(() => execute(app, "read", file), index === children.length - 1 ? /id already exists: n1-rect/ : /invalid box: n1/);
        assert.deepEqual(state(app), before);
        execute(app, "redo"); assert.deepEqual(state(app), redo);
    }
});

test("box handler conflicts and partially failing custom handlers preserve the complete transaction", () => {
    const app = setup(); createBox(app);
    const loader = new PluginLoader(app.registry, app.services);
    class FaultPlugin {
        name = "fault"; contributes = { attributes: ["fault"] };
        activate(ctx) { ctx.registerAttribute("fault", new class {
            handles(context, attr) { return context.shape instanceof BoxShape && attr === "partial"; }
            apply(context) { context.shape.setBodyFill("black"); context.shape.setTitle("partial"); throw new Error("injected failure"); }
        }); }
    }
    loader.loadInstance(new FaultPlugin());
    execute(app, "set", "n1", "label", "redo title"); const redo = state(app);
    execute(app, "undo"); const before = state(app);
    assert.throws(() => execute(app, "set", "n1", "partial", "x"), /injected failure/);
    assert.deepEqual(state(app), before); execute(app, "redo"); assert.deepEqual(state(app), redo);
    class ConflictPlugin {
        name = "conflict"; contributes = { attributes: ["conflict"] };
        activate(ctx) { ctx.registerAttribute("conflict", new class {
            handles(context, attr) { return context.shape instanceof BoxShape && attr === "fill"; }
            apply() { throw new Error("must not execute"); }
        }); }
    }
    loader.loadInstance(new ConflictPlugin()); const conflictBefore = state(app);
    assert.throws(() => execute(app, "set", "n1", "fill", "green"), /ambiguous attribute handler: fill/);
    assert.deepEqual(state(app), conflictBefore);
    execute(app, "create", "rect", "r1", "0", "0", "1", "1");
    execute(app, "set", "r1", "fill", "red");
    assert.throws(() => execute(app, "set", "r1", "label", "not defined"), /unknown attribute: label/);
});

test("stats counts real box children and decorator only labels box containers", () => {
    const app = setup(); createBox(app); createBox(app, "n2", "n1");
    new PluginLoader(app.registry, app.services).loadInstance(new StatsPlugin());
    assert.equal(execute(app, "stats"), "rect: 2  text: 2  (total 4, containers 2)");
    assert.equal(execute(app, "tree").split("(box)").length - 1, 2);
    assert.match(execute(app, "help"), /、box。/);
    const instance = new BoxPlugin();
    const metadata = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../src/plugins/box/package.json"), "utf8"));
    assert.equal(instance.name, metadata.name); assert.deepEqual(instance.contributes, metadata.contributes);
});

test("box code/config assembly use identical options, registrations and output", (t) => {
    const directory = temporary(t);
    const filename = path.join(directory, "plugins.config.json");
    const options = { fill: "orange" };
    fs.writeFileSync(filename, JSON.stringify({ plugins: [{ module: path.resolve(__dirname, "../src/plugins/box"), options }] }));
    const code = createApplication();
    const config = createApplication();
    assert.equal(new PluginLoader(code.registry, code.services).loadInstance(new BoxPlugin(), options), true);
    assert.equal(new PluginLoader(config.registry, config.services).loadConfig(filename), true);
    assert.deepEqual(code.registry.names(), config.registry.names());
    for (const app of [code, config]) { execute(app, "init"); createBox(app); }
    assert.deepEqual(state(code), state(config));
    assert.equal(shape(config, "n1-rect").toSvgElement().getAttribute("fill"), "orange");
    assert.equal(execute(code, "tree"), execute(config, "tree"));
});
