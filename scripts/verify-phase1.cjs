const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawnSync } = require("node:child_process");
const assert = require("node:assert/strict");

const root = path.resolve(__dirname, "..");
const transcripts = path.join(root, "doc/transcript");
const record = process.argv.includes("--record");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "svg-phase1-"));
const baseline = path.join(temp, "baseline");
const current = path.join(temp, "current");
const sessions = ["cli-1", "cli-flowchart", "cli-commands"];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, maxBuffer: 16 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  }
  return result.stdout;
}

function compile(directory) {
  fs.symlinkSync(path.join(root, "node_modules"), path.join(directory, "node_modules"), "junction");
  // Compile both revisions with the same installed compiler and dependencies.
  const compilerPackage = require.resolve("typescript/package.json");
  const metadata = JSON.parse(fs.readFileSync(compilerPackage, "utf8"));
  const compiler = path.resolve(path.dirname(compilerPackage), metadata.bin.tsc);
  run(process.execPath, [compiler, "-p", directory]);
}

function replay(directory, name) {
  const cwd = path.join(temp, `${path.basename(directory)}-${name}`);
  fs.mkdirSync(cwd);
  fs.cpSync(path.join(transcripts, "fixtures"), cwd, { recursive: true });
  const input = fs.readFileSync(path.join(transcripts, `${name}.txt`));
  // Explicitly disable optional plugins for the current application, preserving historical invocation.
  const args = [path.join(directory, "dist/main.js")];
  if (directory === current) args.push("--no-plugins");
  const output = run(process.execPath, args, { cwd, input });
  const files = Object.fromEntries(fs.readdirSync(cwd)
    .filter((file) => file.endsWith(".svg") && file !== "other.svg")
    .sort().map((file) => [file, fs.readFileSync(path.join(cwd, file))]));
  return { output, files };
}

try {
  fs.mkdirSync(baseline);
  const archive = path.join(temp, "final.tar");
  fs.writeFileSync(archive, run("git", ["archive", "final", "src", "tsconfig.json", "package.json"]));
  run("tar", ["-xf", archive, "-C", baseline]);
  fs.mkdirSync(current);
  for (const entry of ["src", "tsconfig.json", "package.json"]) {
    fs.cpSync(path.join(root, entry), path.join(current, entry), { recursive: true });
  }
  compile(baseline);
  compile(current);
  const expectedDirectory = path.join(transcripts, "expected");
  fs.mkdirSync(expectedDirectory, { recursive: true });
  for (const name of sessions) {
    const before = replay(baseline, name);
    const after = replay(current, name);
    const expected = path.join(expectedDirectory, `${name}.stdout.txt`);
    const expectedSvgDirectory = path.join(expectedDirectory, name);
    if (record) {
      fs.writeFileSync(expected, before.output);
      fs.mkdirSync(expectedSvgDirectory, { recursive: true });
      for (const [file, bytes] of Object.entries(before.files)) {
        fs.writeFileSync(path.join(expectedSvgDirectory, file), bytes);
      }
    }
    assert.deepEqual(fs.readFileSync(expected), before.output, `${name}: final output differs from fixture`);
    assert.deepEqual(after.output, before.output, `${name}: stdout changed`);
    assert.deepEqual(Object.keys(after.files), Object.keys(before.files), `${name}: saved file list changed`);
    assert.deepEqual(fs.readdirSync(expectedSvgDirectory).sort(), Object.keys(before.files), `${name}: expected SVG list changed`);
    for (const [file, bytes] of Object.entries(before.files)) {
      assert.deepEqual(fs.readFileSync(path.join(expectedSvgDirectory, file)), bytes, `${name}/${file}: final SVG differs from fixture`);
      assert.deepEqual(after.files[file], bytes, `${name}/${file}: serialized SVG changed`);
    }
    console.log(`PASS ${name}: stdout and ${Object.keys(before.files).length} saved SVG file(s) match final byte for byte`);
  }
  console.log(`Baseline final: ${run("git", ["rev-parse", "final"], { encoding: "utf8" }).trim()}`);
} finally {
  // Verify the deletion target is the exact task-owned temporary directory.
  if (path.dirname(temp) !== path.resolve(os.tmpdir()) || !path.basename(temp).startsWith("svg-phase1-")) {
    throw new Error("Unexpected temporary directory");
  }
  for (const directory of [baseline, current]) {
    const link = path.join(directory, "node_modules");
    if (fs.existsSync(link) && fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link);
  }
  fs.rmSync(temp, { recursive: true, force: true });
}
