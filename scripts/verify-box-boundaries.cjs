const assert = require("node:assert/strict");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const refs = { base: "8408426", code: "73939b8", config: "d812658" };
const base = git("rev-parse", refs.base);
const code = git("rev-parse", refs.code);
const config = git("rev-parse", refs.config);

assert.equal(git("rev-parse", `${code}^`), base, "A must start directly from the common base");
assert.equal(git("rev-parse", `${config}^`), base, "B must start directly from the common base");
assert.equal(git("merge-base", code, config), base);
git("merge-base", "--is-ancestor", code, "HEAD");
git("merge-base", "--is-ancestor", config, "HEAD");

const protectedPaths = ["src/core", "src/model", "src/cli", "src/commands", "src/infrastructure",
    "src/host/plugins", "src/host/activatePlugin.ts", "src/host/createApplication.ts", "src/host/startApplication.ts",
    "src/main.ts", "src/plugins/builtin-commands", "src/plugins/builtin-shapes", "src/plugins/stats", "src/plugins/dir"];
for (const target of protectedPaths) {
    // Do not accept an empty diff for a path that does not actually exist.
    assert.ok(["tree", "blob"].includes(git("cat-file", "-t", `${base}:${target}`)), target);
    for (const commit of [code, config, "HEAD"]) {
        git("cat-file", "-t", `${commit}:${target}`);
        assert.equal(git("diff", "--name-only", base, commit, "--", target), "", `${target} changed at ${commit}`);
    }
}
function sourceChanges(commit) {
    return git("diff", "--name-status", `${commit}^`, commit, "--", "src")
        .split("\n").filter(Boolean).map((line) => line.split("\t"));
}
const a = sourceChanges(code);
const b = sourceChanges(config);
assert.equal(a.filter(([status, file]) => status === "M" && file === "src/host/codePlugins.ts").length, 1);
for (const [status, file] of a) {
    assert.ok((status === "A" && file.startsWith("src/plugins/box/")) ||
        (status === "M" && file === "src/host/codePlugins.ts"), `unexpected A change: ${status} ${file}`);
}
for (const [status, file] of b) assert.ok(status === "A" && file.startsWith("src/plugins/box/"), `unexpected B change: ${status} ${file}`);
assert.equal(b.length, 3, "B must add the complete three-file box package");
assert.equal(git("diff", code, config, "--", "src/plugins/box"), "", "A/B plugin source differs");
assert.equal(git("diff", "--name-only", `${config}^`, config, "--", "plugins.config.json"), "plugins.config.json");
const aConfig = JSON.parse(git("show", `${code}:plugins.box.config.json`));
const bConfig = JSON.parse(git("show", `${config}:plugins.config.json`));
assert.deepEqual(aConfig, bConfig, "A/B plugin order, set or options differ");

console.log(`PASS A ${code}: only new box package and one existing assembly source file`);
console.log(`PASS B ${config}: no existing runtime source changed; root config supplies box`);
console.log("PASS identical plugin sources and identical configuration set/order/options");
console.log("PASS all protected paths exist and kernel, loader and existing plugins are unchanged");
