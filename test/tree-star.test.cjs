const { test } = require("node:test");
const assert = require("node:assert/strict");
const { Shape, Group, SvgDocument } = require("../dist/core");
const { default: TreeStarPlugin, ModifiedStarDecorator } = require("../dist/plugins/tree-star");

// Minimal leaf double; the decorator and these tests do not depend on other plugins.
class Leaf extends Shape {
    constructor(id, text = "original") { super(id); this.text = text; }
    move() {}
    scale() {}
    setAttribute(name, value) { this.text = value; }
    describe() { return `text#${this.getId()}`; }
    clone() { const copy = new Leaf(this.getId(), this.text); this.copyBaseTo(copy); return copy; }
    toSvgElement() { const element = this.createSvgElement("text", {}); element.setText(this.text); return element; }
}
function model() {
    const document = new SvgDocument();
    document.addShape(new Group("left"));
    document.addShape(new Group("right"));
    document.addShape(new Leaf("a"), "left");
    document.addShape(new Leaf("b"), "right");
    return document;
}
function mark(decorator, document, savedDocument, id) {
    return decorator.decorate({ document, savedDocument, shape: id === undefined ? undefined : document.getShape(id) });
}

test("modified-star activates independently and marks a new document and new nodes", () => {
    let registered;
    new TreeStarPlugin().activate({ registerDecorator: (name, instance) => { registered = { name, instance }; } });
    assert.equal(registered.name, "modified-star");
    assert.ok(registered.instance instanceof ModifiedStarDecorator);
    const document = model();
    for (const id of [undefined, "left", "a", "right", "b"]) assert.equal(mark(registered.instance, document, undefined, id), "*");
});

test("state machine edit -> save -> edit -> undo to saved -> redo, including ancestors", () => {
    const decorator = new ModifiedStarDecorator();
    let document = model();
    document.getShape("a").setAttribute("text", "first edit");
    assert.equal(mark(decorator, document, undefined, "a"), "*");
    const saved = document.clone();
    for (const id of [undefined, "left", "a", "right", "b"]) assert.equal(mark(decorator, document, saved, id), "");
    const undo = document.clone();
    document.getShape("a").setAttribute("text", "second edit");
    const redo = document.clone();
    for (const id of [undefined, "left", "a"]) assert.equal(mark(decorator, document, saved, id), "*");
    for (const id of ["right", "b"]) assert.equal(mark(decorator, document, saved, id), "");
    document = undo.clone();
    for (const id of [undefined, "left", "a", "right", "b"]) assert.equal(mark(decorator, document, saved, id), "");
    document = redo.clone();
    assert.equal(mark(decorator, document, saved, "a"), "*");
    const nextSaved = document.clone();
    assert.equal(mark(decorator, document, nextSaved, "a"), "");
});

test("adding, deleting, reparenting and changing canvas mark only affected content and ancestry", () => {
    const decorator = new ModifiedStarDecorator();
    let document = model(); const saved = document.clone();
    document.addShape(new Leaf("new"), "left");
    for (const id of [undefined, "left", "new"]) assert.equal(mark(decorator, document, saved, id), "*");
    assert.equal(mark(decorator, document, saved, "a"), "");
    document = saved.clone(); document.removeShape("a");
    assert.equal(mark(decorator, document, saved, "left"), "*");
    assert.equal(mark(decorator, document, saved, "b"), "");
    document = saved.clone(); document.addTo("right", "a");
    for (const id of [undefined, "left", "right", "a"]) assert.equal(mark(decorator, document, saved, id), "*");
    assert.equal(mark(decorator, document, saved, "b"), "");
    document = saved.clone(); document.resize(100, 200);
    assert.equal(mark(decorator, document, saved), "*");
    assert.equal(mark(decorator, document, saved, "a"), "");
});

test("ordering affects ancestor rows, restored identical content is clean, and contexts are never mutated", () => {
    const document = model(); const saved = document.clone();
    const decorator = new ModifiedStarDecorator();
    document.bringToFront("left");
    assert.equal(mark(decorator, document, saved), "*");
    assert.equal(mark(decorator, document, saved, "left"), "");
    document.sendToBack("left");
    document.getShape("a").setAttribute("text", "edited");
    document.getShape("a").setAttribute("text", "original");
    const before = document.toSvgElement().toXml();
    const baseline = saved.toSvgElement().toXml();
    const context = Object.freeze({ document, savedDocument: saved, shape: document.getShape("a") });
    assert.equal(decorator.decorate(context), "");
    assert.equal(document.toSvgElement().toXml(), before);
    assert.equal(saved.toSvgElement().toXml(), baseline);
});

test("cache resets across init/read and separate decorator instances do not share state", () => {
    const first = new ModifiedStarDecorator(); const second = new ModifiedStarDecorator();
    const document = model(); const oldSaved = document.clone();
    document.getShape("a").setAttribute("text", "new baseline");
    const newSaved = document.clone();
    assert.equal(mark(first, document, oldSaved, "a"), "*");
    assert.equal(mark(second, document, newSaved, "a"), "");
    assert.equal(mark(first, document, oldSaved.clone(), "a"), "*");
    assert.equal(mark(first, document, newSaved.clone(), "a"), "");
    assert.equal(mark(first, document, undefined, "a"), "*");
    assert.equal(mark(first, document, newSaved.clone(), "a"), "");
    const reinitialized = model();
    assert.equal(mark(first, reinitialized, undefined, "a"), "*");
    assert.equal(mark(first, reinitialized, oldSaved.clone(), "a"), "");
});
