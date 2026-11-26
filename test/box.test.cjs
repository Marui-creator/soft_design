const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Shape, Group, SvgElement } = require("../dist/core");
const { default: BoxPlugin, BoxProvider, BoxShape, BoxAttributeHandler, BoxTypeDecorator } = require("../dist/plugins/box");

// Independent domain test double: no built-in shape provider or other plugin is imported.
class Part extends Shape {
    constructor(tag, id, attributes, text) {
        super(id); this.tag = tag; this.attributes = new Map(Object.entries(attributes)); this.text = text;
    }
    setAttribute(name, value) { if (name === "text") this.text = value; else this.attributes.set(name, value); }
    move(dx, dy) {
        this.attributes.set("x", String(Number(this.attributes.get("x")) + dx));
        this.attributes.set("y", String(Number(this.attributes.get("y")) + dy));
    }
    scale(factor) { for (const name of ["x", "y", "width", "height"]) {
        if (this.attributes.has(name)) this.attributes.set(name, String(Number(this.attributes.get(name)) * factor));
    } }
    describe() { return `${this.tag}#${this.getId()}`; }
    clone() {
        const copy = new Part(this.tag, this.getId(), Object.fromEntries(this.attributes), this.text);
        this.copyBaseTo(copy); return copy;
    }
    toSvgElement() {
        const element = this.createSvgElement(this.tag, Object.fromEntries(this.attributes));
        if (this.text !== undefined) element.setText(this.text);
        return element;
    }
}
function createPart(type, args) {
    if (type === "rect") return new Part(type, args[0], { x: args[1], y: args[2], width: args[3], height: args[4], fill: args[5] });
    if (type === "text") return new Part(type, args[0], { x: args[1], y: args[2] }, args[3]);
    throw new Error(`unexpected requested type: ${type}`);
}
const args = ["n1", "120", "100", "160", "60", "开始"];
function xml(shape) { return shape.toSvgElement().toXml(); }

test("box plugin independently registers shape, attribute and decorator class instances", () => {
    const registered = { shapes: [], attributes: [], decorators: [] };
    new BoxPlugin().activate({ createShape: createPart,
        registerShape: (name, value) => registered.shapes.push([name, value]),
        registerAttribute: (name, value) => registered.attributes.push([name, value]),
        registerDecorator: (name, value) => registered.decorators.push([name, value]),
    });
    assert.equal(registered.shapes[0][0], "box");
    assert.ok(registered.shapes[0][1] instanceof BoxProvider);
    assert.ok(registered.attributes[0][1] instanceof BoxAttributeHandler);
    assert.ok(registered.decorators[0][1] instanceof BoxTypeDecorator);
    const box = registered.shapes[0][1].create(args);
    const [rect, label] = box.getChildren();
    assert.equal(rect.getId(), "n1-rect");
    assert.equal(label.getId(), "n1-label");
    assert.equal(rect.toSvgElement().getAttribute("fill"), "#4a90d9");
    assert.equal(label.toSvgElement().getAttribute("x"), "140");
    assert.equal(label.toSvgElement().getAttribute("y"), "135");
    assert.equal(label.toSvgElement().getText(), "开始");
    assert.equal(box.toSvgElement().getAttribute("data-kind"), "box");
});

test("box provider validates argument count, finite geometry, dimensions and options", () => {
    const provider = new BoxProvider(createPart);
    assert.throws(() => provider.create([]), /usage: create box/);
    for (const value of ["", " ", "NaN", "Infinity", "abc"]) {
        assert.throws(() => provider.create(["n", value, "0", "10", "10", "title"]), /finite numbers/);
    }
    assert.throws(() => provider.create(["n", "0", "0", "-1", "10", "title"]), /must not be negative/);
    assert.throws(() => provider.create(["", "0", "0", "10", "10", "title"]), /must not be empty/);
    assert.equal(provider.create(["n", "0", "0", "0", "0", ""]).getChildren()[1].toSvgElement().getText(), "");
    const registrations = [];
    const ctx = { createShape: createPart, registerShape: (_, value) => registrations.push(value), registerAttribute() {}, registerDecorator() {} };
    new BoxPlugin().activate(ctx, { fill: "orange" });
    assert.equal(registrations[0].create(args).getChildren()[0].toSvgElement().getAttribute("fill"), "orange");
    for (const options of [null, [], "red", { fill: 1 }, { unknown: true }]) {
        assert.throws(() => new BoxPlugin().activate(ctx, options), /invalid box options/);
    }
});

test("box composition preserves clone identity, styles, transforms, parents and nested movement", () => {
    const provider = new BoxProvider(createPart);
    const box = provider.create(args);
    box.setAttribute("stroke-width", "2");
    box.setAttribute("stroke", "black");
    box.setTransform("translate(3 4)");
    box.setParentId("outer");
    const nested = provider.create(["nested", "10", "20", "30", "40", "inner"]);
    box.addChild(nested);
    const clone = box.clone();
    assert.ok(clone instanceof BoxShape);
    assert.ok(clone.getChildren()[2] instanceof BoxShape);
    assert.equal(xml(clone), xml(box));
    assert.equal(clone.getParentId(), "outer");
    assert.equal(clone.getTransform(), "translate(3 4)");
    assert.match(clone.describe(), /parent=g#outer/);
    clone.setTitle("clone only");
    assert.equal(box.getChildren()[1].toSvgElement().getText(), "开始");
    clone.move(5, 7);
    assert.equal(clone.getChildren()[0].toSvgElement().getAttribute("x"), "125");
    assert.equal(clone.getChildren()[2].getChildren()[0].toSvgElement().getAttribute("y"), "27");
    clone.scale(2);
    assert.equal(clone.getChildren()[0].toSvgElement().getAttribute("x"), "250");
    assert.equal(box.getChildren()[0].toSvgElement().getAttribute("x"), "120");
});

test("box protects required parts but supports normal added children and independent attribute handler", () => {
    const box = new BoxProvider(createPart).create(args);
    for (const id of ["n1-rect", "n1-label"]) assert.throws(() => box.removeChild(id), /cannot detach required box part/);
    assert.throws(() => box.canUngroup(), { message: "cannot ungroup composite shape: n1" });
    box.addChild(createPart("text", ["extra", "0", "0", "extra"]));
    assert.equal(box.removeChild("extra").getId(), "extra");
    const handler = new BoxAttributeHandler();
    const context = { shape: box };
    assert.equal(handler.handles(context, "fill"), true);
    assert.equal(handler.handles(context, "label"), true);
    assert.equal(handler.handles(context, "text"), false);
    assert.equal(handler.handles({ shape: new Group("ordinary") }, "label"), false);
    handler.apply(context, "fill", "red");
    handler.apply(context, "label", "标题 & <内容>");
    assert.equal(box.getChildren()[0].toSvgElement().getAttribute("fill"), "red");
    assert.equal(box.getChildren()[1].toSvgElement().getText(), "标题 & <内容>");
    assert.equal(box.toSvgElement().getAttribute("label"), undefined);
    assert.throws(() => handler.apply(context, "invalid", "x"), /unsupported box attribute/);
    const decorator = new BoxTypeDecorator();
    assert.equal(decorator.decorate({ shape: box }), "(box)");
    assert.equal(decorator.decorate({ shape: undefined }), "");
    assert.equal(decorator.decorate({ shape: new Group("ordinary") }), "");
});

test("box reads parts through a supplied context and rejects missing or wrongly typed parts", () => {
    const provider = new BoxProvider(createPart);
    const source = provider.create(args).toSvgElement();
    const read = (element) => new Part(element.getTag(), element.getAttribute("id"),
        element.getTag() === "rect" ? { x: "120", y: "100", width: "160", height: "60", fill: "#4a90d9" } : { x: "140", y: "135" },
        element.getText());
    assert.equal(provider.canRead(source), true);
    assert.equal(xml(provider.read(source, { read })), xml(provider.create(args)));
    const missing = new SvgElement("g"); missing.setAttribute("id", "n1"); missing.setAttribute("data-kind", "box");
    assert.throws(() => provider.read(missing, { read }), /invalid box: n1/);
    const wrong = new Group("n1");
    wrong.addChild(new Part("circle", "n1-rect", {}));
    wrong.addChild(createPart("text", ["n1-label", "0", "0", "text"]));
    assert.throws(() => new BoxShape(wrong), /invalid box: n1/);
});
