---
noteId: "adfb2cb0e97911f185a7b5fa6e6e8700"
tags: []

---

# CLI metrics (generated)

Before: 2a816c205b6518c1286cae56fe513135c1dbb64f
After: a05add8f33f66d6e16f1c4731a3df5b15f3f3e70

| Category | Before LOC | After LOC | Delta LOC | Before CC | After CC | Delta CC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| kernel | 2798 | 1407 | -1391 | 537 | 324 | -213 |
| assembly | 70 | 278 | 208 | 1 | 93 | 92 |
| plugins | 0 | 1766 | 1766 | 0 | 395 | 395 |

LOC includes comments and blank lines. CC sums module and implemented-function complexities; each starts at 1.
Decisions: if, for/for-in/for-of, while, do, case, catch, ternary, &&, ||, ??. Nested functions are counted separately.
Declarations without bodies are excluded. VSCode sources are listed separately. Tests, dependencies and build output are excluded.
Classification follows paths at each revision; moved implementations change categories. Full per-function data: report.json.
CLI total: LOC 2868 -> 3451; CC 538 -> 812.
Only committed Git objects are measured; uncommitted edits are excluded. Category movement is not itself a reduction in total code complexity.
After the final p2 tag exists, reproduce the comparison with: npm run metrics -- --from final --to p2. Never move existing tags.

## After: CLI file inventory

| File | Category | LOC | CC | Responsibility |
| --- | --- | ---: | ---: | --- |
| src/cli/CliApplication.ts | kernel | 30 | 10 | CLI input and command dispatch |
| src/cli/CommandParser.ts | kernel | 39 | 9 | CLI input and command dispatch |
| src/commands/Command.ts | kernel | 3 | 1 | Editor state, history and command/IO contracts |
| src/commands/CommandHistory.ts | kernel | 83 | 11 | Editor state, history and command/IO contracts |
| src/commands/DocumentReadResult.ts | kernel | 20 | 4 | Editor state, history and command/IO contracts |
| src/commands/DocumentReader.ts | kernel | 5 | 1 | Editor state, history and command/IO contracts |
| src/commands/DocumentWriter.ts | kernel | 5 | 1 | Editor state, history and command/IO contracts |
| src/commands/EditorSession.ts | kernel | 54 | 10 | Editor state, history and command/IO contracts |
| src/commands/HistoryEditCommand.ts | kernel | 13 | 3 | Editor state, history and command/IO contracts |
| src/core/DirectoryReader.ts | kernel | 10 | 1 | Extension contracts, public API and registry |
| src/core/ExtensionRegistry.ts | kernel | 60 | 35 | Extension contracts, public API and registry |
| src/core/extensions.ts | kernel | 76 | 1 | Extension contracts, public API and registry |
| src/core/index.ts | kernel | 14 | 1 | Extension contracts, public API and registry |
| src/host/activatePlugin.ts | assembly | 48 | 21 | Startup assembly and activation |
| src/host/codePlugins.ts | assembly | 13 | 2 | Startup assembly and activation |
| src/host/createApplication.ts | assembly | 69 | 4 | Startup assembly and activation |
| src/host/plugins/PluginLoader.ts | assembly | 133 | 58 | Startup assembly and activation |
| src/host/startApplication.ts | assembly | 12 | 7 | Startup assembly and activation |
| src/infrastructure/NodeDirectoryReader.ts | kernel | 15 | 7 | XML and filesystem adapters |
| src/infrastructure/SvgFileReader.ts | kernel | 20 | 4 | XML and filesystem adapters |
| src/infrastructure/SvgFileWriter.ts | kernel | 18 | 3 | XML and filesystem adapters |
| src/infrastructure/SvgXmlParser.ts | kernel | 190 | 44 | XML and filesystem adapters |
| src/main.ts | assembly | 3 | 1 | Startup assembly and activation |
| src/model/Group.ts | kernel | 176 | 42 | Domain objects and shape dispatch |
| src/model/Shape.ts | kernel | 148 | 35 | Domain objects and shape dispatch |
| src/model/ShapeFactory.ts | kernel | 27 | 19 | Domain objects and shape dispatch |
| src/model/SvgDocument.ts | kernel | 335 | 66 | Domain objects and shape dispatch |
| src/model/SvgElement.ts | kernel | 66 | 16 | Domain objects and shape dispatch |
| src/plugins/box/BoxShape.ts | plugins | 68 | 30 | Composite domain object and required-part protection |
| src/plugins/box/index.ts | plugins | 82 | 36 | Box provider, attribute semantics and type label |
| src/plugins/builtin-commands/HelpCommand.ts | plugins | 19 | 8 | Command registration and help |
| src/plugins/builtin-commands/commands/AddToCommand.ts | plugins | 21 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/commands/BackCommand.ts | plugins | 19 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/commands/CanvasCommand.ts | plugins | 27 | 5 | Built-in command behavior |
| src/plugins/builtin-commands/commands/CreateCommand.ts | plugins | 42 | 7 | Built-in command behavior |
| src/plugins/builtin-commands/commands/DeleteCommand.ts | plugins | 18 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/commands/FrontCommand.ts | plugins | 19 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/commands/GroupCommand.ts | plugins | 22 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/commands/InitCommand.ts | plugins | 24 | 6 | Built-in command behavior |
| src/plugins/builtin-commands/commands/MoveCommand.ts | plugins | 27 | 6 | Built-in command behavior |
| src/plugins/builtin-commands/commands/ReadCommand.ts | plugins | 30 | 5 | Built-in command behavior |
| src/plugins/builtin-commands/commands/RedoCommand.ts | plugins | 14 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/commands/SaveCommand.ts | plugins | 34 | 7 | Built-in command behavior |
| src/plugins/builtin-commands/commands/ScaleCommand.ts | plugins | 26 | 6 | Built-in command behavior |
| src/plugins/builtin-commands/commands/SetCommand.ts | plugins | 26 | 7 | Built-in command behavior |
| src/plugins/builtin-commands/commands/ShowCommand.ts | plugins | 24 | 5 | Built-in command behavior |
| src/plugins/builtin-commands/commands/TreeCommand.ts | plugins | 81 | 18 | Built-in command behavior |
| src/plugins/builtin-commands/commands/UndoCommand.ts | plugins | 14 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/commands/UngroupCommand.ts | plugins | 18 | 4 | Built-in command behavior |
| src/plugins/builtin-commands/index.ts | plugins | 24 | 7 | Command registration and help |
| src/plugins/builtin-shapes/index.ts | plugins | 97 | 23 | Shape provider creation and readback |
| src/plugins/builtin-shapes/shapes/Circle.ts | plugins | 164 | 27 | Built-in shape behavior |
| src/plugins/builtin-shapes/shapes/Ellipse.ts | plugins | 185 | 30 | Built-in shape behavior |
| src/plugins/builtin-shapes/shapes/Line.ts | plugins | 181 | 28 | Built-in shape behavior |
| src/plugins/builtin-shapes/shapes/Rect.ts | plugins | 200 | 34 | Built-in shape behavior |
| src/plugins/builtin-shapes/shapes/Text.ts | plugins | 143 | 27 | Built-in shape behavior |
| src/plugins/dir/index.ts | plugins | 30 | 14 | Read-only directory command against DirectoryReader |
| src/plugins/stats/index.ts | plugins | 37 | 12 | Read-only depth-first shape statistics |
| src/plugins/tree-star/index.ts | plugins | 50 | 15 | Saved-content comparison and dirty tree label |

## After: VSCode sources (separate)

| File | LOC | CC |
| --- | ---: | ---: |
| vscode-extension/src/SvgDocumentSymbolProvider.ts | 28 | 7 |
| vscode-extension/src/SvgOutlineParser.ts | 51 | 13 |
| vscode-extension/src/extension.ts | 40 | 8 |
