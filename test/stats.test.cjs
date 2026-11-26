const { test } = require("node:test");
const assert = require("node:assert/strict");
const { StatsCommand, default: StatsPlugin } = require("../dist/plugins/stats");

function leaf(type) {
    return { isContainer: () => false, toSvgElement: () => ({ getTag: () => type, getAttribute: () => undefined }) };
}
function container(children) {
    return { isContainer: () => true, getChildren: () => children,
        toSvgElement: () => { throw new Error("container must not be counted as a leaf"); } };
}

test("stats independently counts DFS first-occurrence order, nested containers and composite children", () => {
    const g = container([leaf("text"), leaf("rect"), container([leaf("circle"), leaf("rect")])]);
    const box = container([leaf("rect"), leaf("text")]);
    const command = new StatsCommand({ getDocument: () => ({ getShapes: () => [g, box] }) });
    assert.equal(command.execute([]), "text: 2  rect: 3  circle: 1  (total 6, containers 3)");
    assert.throws(() => command.execute(["unexpected"]), /usage: stats/);
    const empty = new StatsCommand({ getDocument: () => ({ getShapes: () => [] }) });
    assert.equal(empty.execute([]), "(total 0, containers 0)");
});

test("stats plugin activates against a minimal extension context without other plugins", () => {
    const contributions = [];
    new StatsPlugin().activate({
        editor: { getDocument: () => ({ getShapes: () => [] }) },
        registerCommand: (name, command) => contributions.push([name, command]),
    });
    assert.equal(contributions.length, 1);
    assert.equal(contributions[0][0], "stats");
    assert.equal(contributions[0][1].execute([]), "(total 0, containers 0)");
});
