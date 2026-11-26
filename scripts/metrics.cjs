const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
// Reuse the classic compiler API already declared by the extension workspace.
const ts = require("../vscode-extension/node_modules/typescript");
const root = path.resolve(__dirname, "..");
const value = (flag, fallback) => {
    const index = process.argv.indexOf(flag);
    if (index < 0) return fallback;
    if (!process.argv[index + 1] || process.argv[index + 1].startsWith("--")) throw new Error(`missing ${flag}`);
    return process.argv[index + 1];
};
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
const from = git("rev-parse", "--verify", `${value("--from", "final")}^{commit}`).trim();
const to = git("rev-parse", "--verify", `${value("--to", "HEAD")}^{commit}`).trim();

function category(file) {
    if (file === "src/main.ts" || file.startsWith("src/host/")) return "assembly";
    if (file.startsWith("src/plugins/")) return "plugins";
    // On final, these implementations had not yet been moved into plugin packages.
    return "kernel";
}
function responsibility(file) {
    if (file.startsWith("vscode-extension/")) return "VSCode extension (excluded from CLI totals)";
    if (file.startsWith("src/host/") || file === "src/main.ts") return "Startup assembly and activation";
    if (file.includes("builtin-shapes/shapes/")) return "Built-in shape behavior";
    if (file.includes("builtin-shapes/")) return "Shape provider creation and readback";
    if (file.includes("builtin-commands/commands/")) return "Built-in command behavior";
    if (file.includes("builtin-commands/")) return "Command registration and help";
    if (file.startsWith("src/core/")) return "Extension contracts, public API and registry";
    if (file.startsWith("src/model/")) return "Domain objects and shape dispatch";
    if (/^src\/commands\/(?:Init|Canvas|Create|Show|Tree|Move|Scale|Set|Delete|AddTo|Group|Ungroup|Front|Back|Undo|Redo|Save|Read)Command\.ts$/.test(file)) return "Legacy built-in command (before extraction)";
    if (file.startsWith("src/commands/")) return "Editor state, history and command/IO contracts";
    if (file.startsWith("src/infrastructure/")) return "XML and filesystem adapters";
    return "CLI input and command dispatch";
}
function measure(file, text) {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const routines = [];
    const isRoutine = (node) => ts.isFunctionLike(node) && node.body !== undefined;
    function routine(node, body, name) {
        let complexity = 1;
        function visit(child) {
            if (child !== node && isRoutine(child)) {
                routine(child, child.body, child.name?.getText(source) ?? "<anonymous>");
                return;
            }
            if (ts.isIfStatement(child) || ts.isForStatement(child) || ts.isForInStatement(child) ||
                ts.isForOfStatement(child) || ts.isWhileStatement(child) || ts.isDoStatement(child) ||
                ts.isCaseClause(child) || ts.isCatchClause(child) || ts.isConditionalExpression(child)) complexity++;
            if (ts.isBinaryExpression(child) && [ts.SyntaxKind.AmpersandAmpersandToken,
                ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(child.operatorToken.kind)) complexity++;
            ts.forEachChild(child, visit);
        }
        visit(body);
        routines.push({ name, line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, complexity });
    }
    routine(source, source, "<module>");
    return {
        file, category: category(file), responsibility: responsibility(file),
        lines: text ? text.replace(/\r\n/g, "\n").split("\n").length - (text.endsWith("\n") ? 1 : 0) : 0,
        complexity: routines.reduce((sum, routine) => sum + routine.complexity, 0), routines,
    };
}
function snapshot(commit) {
    const files = git("ls-tree", "-r", "--name-only", commit, "--", "src", "vscode-extension/src")
        .trim().split("\n").filter((file) => file.endsWith(".ts"));
    const measured = files.map((file) => measure(file, git("show", `${commit}:${file}`)));
    const totals = Object.fromEntries(["kernel", "assembly", "plugins"].map((name) => {
        const subset = measured.filter((file) => file.file.startsWith("src/") && file.category === name);
        return [name, { files: subset.length, lines: subset.reduce((sum, file) => sum + file.lines, 0),
            complexity: subset.reduce((sum, file) => sum + file.complexity, 0) }];
    }));
    return { commit, totals, cli: measured.filter((file) => file.file.startsWith("src/")),
        vscode: measured.filter((file) => file.file.startsWith("vscode-extension/")) };
}
const before = snapshot(from);
const after = snapshot(to);
const report = { before, after, delta: Object.fromEntries(Object.keys(before.totals).map((category) => [category,
    Object.fromEntries(["files", "lines", "complexity"].map((key) => [key, after.totals[category][key] - before.totals[category][key]]))])) };
const output = path.join(root, "docs/metrics");
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
const rows = Object.keys(before.totals).map((category) => `| ${category} | ${before.totals[category].lines} | ${after.totals[category].lines} | ${report.delta[category].lines} | ${before.totals[category].complexity} | ${after.totals[category].complexity} | ${report.delta[category].complexity} |`);
fs.writeFileSync(path.join(output, "README.md"), [
    "# CLI metrics (generated)", "", `Before: ${from}`, `After: ${to}`, "",
    "| Category | Before LOC | After LOC | Delta LOC | Before CC | After CC | Delta CC |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |", ...rows, "",
    "LOC includes comments and blank lines. CC sums module and implemented-function complexities; each starts at 1.",
    "Decisions: if, for/for-in/for-of, while, do, case, catch, ternary, &&, ||, ??. Nested functions are counted separately.",
    "Declarations without bodies are excluded. VSCode sources are listed separately. Tests, dependencies and build output are excluded.",
    "Classification follows paths at each revision; moved implementations change categories. Full per-function data: report.json.",
    "Only committed Git objects are measured; uncommitted edits are excluded. Regenerate after committing framework changes.",
    "At final delivery run: npm run metrics -- --from final --to p2. Never move either tag.", "",
    "## After: CLI file inventory", "", "| File | Category | LOC | CC | Responsibility |", "| --- | --- | ---: | ---: | --- |",
    ...after.cli.map((file) => `| ${file.file} | ${file.category} | ${file.lines} | ${file.complexity} | ${file.responsibility} |`),
    "", "## After: VSCode sources (separate)", "", "| File | LOC | CC |", "| --- | ---: | ---: |",
    ...after.vscode.map((file) => `| ${file.file} | ${file.lines} | ${file.complexity} |`), "",
].join("\n"));
console.log(`Metrics generated from Git history: ${from} -> ${to}`);
