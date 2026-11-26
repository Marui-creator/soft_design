import { CliApplication } from "../cli/CliApplication";
import { ExtensionRegistry } from "../core/ExtensionRegistry";
import { activatePlugin } from "./activatePlugin";
import BuiltinShapesPlugin from "../plugins/builtin-shapes";
import BuiltinCommandsPlugin, { NamedCommand } from "../plugins/builtin-commands";
import { HelpCommand } from "../plugins/builtin-commands/HelpCommand";
import { EditorSession } from "../commands/EditorSession";
import { CommandHistory } from "../commands/CommandHistory";
import { HistoryEditCommand } from "../commands/HistoryEditCommand";
import { InitCommand } from "../plugins/builtin-commands/commands/InitCommand";
import { CanvasCommand } from "../plugins/builtin-commands/commands/CanvasCommand";
import { CreateCommand } from "../plugins/builtin-commands/commands/CreateCommand";
import { ShowCommand } from "../plugins/builtin-commands/commands/ShowCommand";
import { TreeCommand } from "../plugins/builtin-commands/commands/TreeCommand";
import { MoveCommand } from "../plugins/builtin-commands/commands/MoveCommand";
import { ScaleCommand } from "../plugins/builtin-commands/commands/ScaleCommand";
import { SetCommand } from "../plugins/builtin-commands/commands/SetCommand";
import { DeleteCommand } from "../plugins/builtin-commands/commands/DeleteCommand";
import { AddToCommand } from "../plugins/builtin-commands/commands/AddToCommand";
import { GroupCommand } from "../plugins/builtin-commands/commands/GroupCommand";
import { UngroupCommand } from "../plugins/builtin-commands/commands/UngroupCommand";
import { FrontCommand } from "../plugins/builtin-commands/commands/FrontCommand";
import { BackCommand } from "../plugins/builtin-commands/commands/BackCommand";
import { UndoCommand } from "../plugins/builtin-commands/commands/UndoCommand";
import { RedoCommand } from "../plugins/builtin-commands/commands/RedoCommand";
import { SaveCommand } from "../plugins/builtin-commands/commands/SaveCommand";
import { ReadCommand } from "../plugins/builtin-commands/commands/ReadCommand";
import type { Command } from "../commands/Command";
import { ShapeFactory } from "../model/ShapeFactory";
import { SvgFileWriter } from "../infrastructure/SvgFileWriter";
import { SvgFileReader } from "../infrastructure/SvgFileReader";
import { SvgXmlParser } from "../infrastructure/SvgXmlParser";

/** 组合根：具体实现的选择与对象连接只发生在宿主一侧。 */
export function createApplication() {
    const registry = new ExtensionRegistry();
    const session = new EditorSession();
    const history = new CommandHistory(session);
    const factory = new ShapeFactory(registry);
    const services = { editor: session, createShape: factory.create.bind(factory) };
    activatePlugin(registry, new BuiltinShapesPlugin(), undefined, services);
    const edit = (command: Command) => new HistoryEditCommand(command, history);
    const commands = [
        new NamedCommand("init", "init [w] [h]", "文档", new InitCommand(session, history)),
        new NamedCommand("read", "read <file.svg>", "文档", new ReadCommand(session, new SvgFileReader(new SvgXmlParser(factory)), history)),
        new NamedCommand("save", "save [file.svg]", "文档", new SaveCommand(session, new SvgFileWriter(), history)),
        new NamedCommand("canvas", "canvas [w] [h]", "文档", new CanvasCommand(session, history)),
        new NamedCommand("create", "create <type> <id> [params…] [in <containerId>]", "图形编辑", edit(new CreateCommand(session, factory))),
        new NamedCommand("delete", "delete <id>", "图形编辑", edit(new DeleteCommand(session))),
        new NamedCommand("move", "move <id> <dx> <dy>", "图形编辑", edit(new MoveCommand(session))),
        new NamedCommand("scale", "scale <id> <factor>", "图形编辑", edit(new ScaleCommand(session))),
        new NamedCommand("set", "set <id> <attr> <value>", "图形编辑", edit(new SetCommand(session, registry))),
        new NamedCommand("group", "group <newGid> <id1> <id2>…", "图形编辑", edit(new GroupCommand(session))),
        new NamedCommand("ungroup", "ungroup <gid>", "图形编辑", edit(new UngroupCommand(session))),
        new NamedCommand("addto", "addto <gid> <id>", "图形编辑", edit(new AddToCommand(session))),
        new NamedCommand("front", "front <id>", "图形编辑", edit(new FrontCommand(session))),
        new NamedCommand("back", "back <id>", "图形编辑", edit(new BackCommand(session))),
        new NamedCommand("tree", "tree [id]", "显示", new TreeCommand(session, registry)),
        new NamedCommand("show", "show <id>", "显示", new ShowCommand(session)),
        new HelpCommand(registry),
        new NamedCommand("undo", "undo", "撤销重做", new UndoCommand(history)),
        new NamedCommand("redo", "redo", "撤销重做", new RedoCommand(history)),
    ];
    activatePlugin(registry, new BuiltinCommandsPlugin(commands), undefined, services);
    return { application: new CliApplication(registry), registry, session, history, factory, services };
}
