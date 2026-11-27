const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function extension(stat) {
  class FileDecoration {
    constructor(badge, tooltip) { Object.assign(this, { badge, tooltip }); }
  }
  const registrations = [];
  const vscode = {
    FileType: { File: 1, Directory: 2 }, FileDecoration,
    workspace: { fs: { stat } },
    window: { registerFileDecorationProvider(provider) {
      registrations.push({ kind: "decoration", provider }); return { dispose() {} };
    } },
    languages: { registerDocumentSymbolProvider(selector, provider) {
      registrations.push({ kind: "outline", selector, provider }); return { dispose() {} };
    } },
  };
  const exports = {};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../dist/extension.js"), "utf8"), {
    exports,
    require: (name) => {
      if (name === "vscode") return vscode;
      if (name === "./SvgDocumentSymbolProvider") return { SvgDocumentSymbolProvider: class {} };
      throw new Error(`unexpected dependency: ${name}`);
    },
  });
  return { ...exports, registrations };
}
const token = { isCancellationRequested: false };

test("SVG file gets a non-propagating badge; directories and ordinary files do not", async () => {
  let calls = 0;
  const { SvgFileDecorationProvider } = extension(async (uri) => {
    calls++; return { type: uri.path === "/folder.svg" ? 2 : 1 };
  });
  const provider = new SvgFileDecorationProvider();
  const uri = Object.freeze({ path: "/image.svg" });
  const badge = await provider.provideFileDecoration(uri, token);
  assert.equal(badge.badge, "[]"); assert.equal(badge.propagate, false);
  assert.equal(uri.path, "/image.svg");
  assert.equal(await provider.provideFileDecoration({ path: "/folder.svg" }, token), undefined);
  assert.equal(await provider.provideFileDecoration({ path: "/plain.txt" }, token), undefined);
  assert.equal(calls, 2);
});

test("missing files are ignored and case-insensitive SVG suffix is supported", async () => {
  const { SvgFileDecorationProvider } = extension(async (uri) => {
    if (uri.path === "/missing.svg") throw new Error("ENOENT");
    return { type: 1 };
  });
  const provider = new SvgFileDecorationProvider();
  assert.equal(await provider.provideFileDecoration({ path: "/missing.svg" }, token), undefined);
  assert.equal((await provider.provideFileDecoration({ path: "/IMAGE.SVG" }, token)).badge, "[]");
});

test("cancellation before or during stat returns no stale decoration", async () => {
  let resolve;
  const { SvgFileDecorationProvider } = extension(() => new Promise((finish) => { resolve = finish; }));
  const provider = new SvgFileDecorationProvider();
  assert.equal(await provider.provideFileDecoration({ path: "/image.svg" }, { isCancellationRequested: true }), undefined);
  const changingToken = { isCancellationRequested: false };
  const pending = provider.provideFileDecoration({ path: "/image.svg" }, changingToken);
  changingToken.isCancellationRequested = true; resolve({ type: 1 });
  assert.equal(await pending, undefined);
});

test("activation registers native decoration and Outline providers as disposable subscriptions", () => {
  const api = extension(async () => ({ type: 1 }));
  const context = { subscriptions: [] };
  api.activate(context);
  assert.equal(context.subscriptions.length, 2);
  assert.equal(api.registrations[0].kind, "decoration");
  assert.equal(api.registrations[1].kind, "outline");
  assert.equal(api.registrations[1].selector.pattern, "**/*.[sS][vV][gG]");
  for (const subscription of context.subscriptions) assert.equal(typeof subscription.dispose, "function");
});
