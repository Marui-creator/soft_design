const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { SvgOutlineParser } = require("../dist/SvgOutlineParser");

test("nested groups, root and leaves include elements without ids", () => {
  const text = fs.readFileSync(path.join(__dirname, "../examples/demo.svg"), "utf8");
  const [root] = new SvgOutlineParser().parse(text);
  assert.equal(root.name, "svg");
  const group = root.children[0];
  assert.equal(group.name, "g#flowchart");
  assert.equal(group.children[0].name, "rect#start");
  assert.equal(group.children[1].name, "g#labels");
  assert.equal(group.children[1].children[0].name, "text");
  assert.equal(text.slice(root.start, root.end), text.trim());
});

test("incomplete and malformed XML returns empty; next valid edit recovers", () => {
  const parser = new SvgOutlineParser();
  for (const text of ["", "<svg><g>", "<svg><g></svg>", '<svg><rect id="',
    "<svg/><svg/>", "<svg><text>&unknown;</text></svg>", "<html/>"]) {
    assert.deepEqual(parser.parse(text), [], text);
  }
  assert.equal(parser.parse("<svg><circle/></svg>")[0].children[0].name, "circle");
});

test("comments, CDATA, quoted >, entities and Unicode preserve source offsets", () => {
  const text = '<?xml version="1.0"?>\r\n<svg><!-- <fake/> -->\r\n<text id="甲&amp;乙" data-note=">">😀<![CDATA[<g/>]]></text><rect/></svg>';
  const [root] = new SvgOutlineParser().parse(text);
  assert.equal(root.children.length, 2);
  assert.equal(root.children[0].name, "text#甲&乙");
  const rect = root.children[1];
  assert.equal(rect.start, text.indexOf("<rect"));
  assert.equal(text.slice(rect.start, rect.end), "<rect/>");
  assert.equal(text.slice(rect.nameStart, rect.nameEnd), "rect");
});

// 使用 VSCode API 的测试替身，验证解析结果到原生符号的映射。
function makeProvider() {
  class Range {
    constructor(start, end) { this.start = start; this.end = end; }
  }
  class DocumentSymbol {
    constructor(name, detail, kind, range, selectionRange) {
      Object.assign(this, { name, detail, kind, range, selectionRange, children: [] });
    }
  }
  const filename = path.join(__dirname, "../dist/SvgDocumentSymbolProvider.js");
  const exports = {};
  vm.runInNewContext(fs.readFileSync(filename, "utf8"), {
    exports,
    require: (name) => name === "vscode"
      ? { Range, DocumentSymbol, SymbolKind: { Object: 18 } }
      : require(path.resolve(path.dirname(filename), name)),
  }, { filename });
  return new exports.SvgDocumentSymbolProvider();
}

test("provider uses current unsaved buffer, maps navigation range and handles cancellation", () => {
  const provider = makeProvider();
  let source = '<svg>\r\n  <rect id="start"/>\r\n</svg>';
  const document = {
    getText: () => source,
    positionAt: (offset) => {
      const lines = source.slice(0, offset).split("\n");
      return { line: lines.length - 1, character: lines.at(-1).length };
    },
  };
  const token = { isCancellationRequested: false };
  const rect = provider.provideDocumentSymbols(document, token)[0].children[0];
  assert.equal(rect.name, "rect#start");
  assert.equal(rect.selectionRange.start.line, 1);
  assert.equal(rect.selectionRange.start.character, 3);
  assert.equal(rect.selectionRange.end.character, 7);
  source = '<svg><circle id="edited"/></svg>';
  assert.equal(provider.provideDocumentSymbols(document, token)[0].children[0].name, "circle#edited");
  source = "<svg>";
  assert.equal(provider.provideDocumentSymbols(document, token).length, 0);
  source = "<svg/>";
  assert.equal(provider.provideDocumentSymbols(document, token).length, 1);
  assert.equal(provider.provideDocumentSymbols(document, { isCancellationRequested: true }).length, 0);
});
