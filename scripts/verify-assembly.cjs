const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const transcripts = path.join(root, "doc/transcript");
const tempParent = path.resolve(os.tmpdir());
const temp = fs.mkdtempSync(path.join(tempParent, "svg-assembly-"));
const workspace = path.join(temp, "workspace");
const sessions = ["cli-1", "cli-flowchart", "cli-plugins", "cli-box", "cli-box-boundaries", "cli-tree-star"];
const record = process.argv.includes("--record");
const configFlag = process.argv.indexOf("--config");
if (configFlag >= 0 && !process.argv[configFlag + 1]) throw new Error("missing --config path");
const configPath = configFlag >= 0 ? path.resolve(process.argv[configFlag + 1]) : path.join(root, "plugins.config.json");

function resetWorkspace() {
    if (path.dirname(workspace) !== temp || path.basename(workspace) !== "workspace") throw new Error("Unexpected workspace");
    fs.rmSync(workspace, { recursive: true, force: true });
    fs.mkdirSync(workspace);
    fs.mkdirSync(path.join(workspace, "docs"));
    fs.mkdirSync(path.join(workspace, "plugins"));
    fs.writeFileSync(path.join(workspace, ".hidden"), "hidden\n");
    fs.writeFileSync(path.join(workspace, "notes.txt"), "fixed working directory\n");
    fs.copyFileSync(path.join(transcripts, "fixtures/other.svg"), path.join(workspace, "other.svg"));
}
function replay(name, args) {
    resetWorkspace();
    const input = fs.readFileSync(path.join(transcripts, `${name}.txt`));
    const child = spawnSync(process.execPath, [path.join(root, "dist/main.js"), ...args], {
        cwd: workspace, input, maxBuffer: 16 * 1024 * 1024,
    });
    if (child.error) throw child.error;
    assert.equal(child.status, 0, child.stderr.toString());
    assert.equal(child.stderr.length, 0, child.stderr.toString());
    const saved = Object.fromEntries(fs.readdirSync(workspace)
        .filter((file) => file.endsWith(".svg") && file !== "other.svg").sort()
        .map((file) => [file, fs.readFileSync(path.join(workspace, file))]));
    return { stdout: child.stdout, saved };
}
try {
    for (const name of sessions) {
        const code = replay(name, []);
        const config = replay(name, ["--config", configPath]);
        assert.deepEqual(code.stdout, config.stdout, `${name}: A/B stdout differs`);
        assert.deepEqual(code.saved, config.saved, `${name}: A/B saved SVG differs`);
        if (name === "cli-box") {
            assert.doesNotMatch(code.stdout.toString(), /error:/);
            assert.equal((code.saved["flowchart-box.svg"].toString().match(/data-kind="box"/g) ?? []).length, 2);
        }
        if (name === "cli-box-boundaries") {
            const output = code.stdout.toString();
            assert.equal((output.match(/error:/g) ?? []).length, 5);
            assert.match(output, /error: cannot ungroup composite shape: n1/);
            assert.match(output, /error: cannot detach required box part: n1-rect/);
            assert.match(output, /error: cannot detach required box part: n1-label/);
            assert.match(output, /error: id already exists: n1-label/);
        }
        const expected = path.join(transcripts, "expected/assembly", `${name}.stdout.txt`);
        if (record) {
            fs.mkdirSync(path.dirname(expected), { recursive: true });
            fs.writeFileSync(expected, code.stdout);
        }
        assert.deepEqual(code.stdout, fs.readFileSync(expected), `${name}: recorded output changed`);
        console.log(`PASS ${name}: code/config stdout and saved SVG match byte for byte`);
    }
    console.log("Directory fixtures were reset at the same path before each run; output stayed outside the listed directory.");
} finally {
    if (path.dirname(temp) !== tempParent || !path.basename(temp).startsWith("svg-assembly-")) throw new Error("Unexpected temporary target");
    fs.rmSync(temp, { recursive: true, force: true });
}
