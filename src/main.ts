import { CliApplication } from "./cli/CliApplication";

import { Command } from "./commands/Command";
import { EditorSession } from "./commands/EditorSession";
import { CommandHistory } from "./commands/CommandHistory";
import { HistoryEditCommand } from "./commands/HistoryEditCommand";

import { InitCommand } from "./commands/InitCommand";
import { CanvasCommand } from "./commands/CanvasCommand";
import { CreateCommand } from "./commands/CreateCommand";
import { ShowCommand } from "./commands/ShowCommand";
import { TreeCommand } from "./commands/TreeCommand";
import { MoveCommand } from "./commands/MoveCommand";
import { ScaleCommand } from "./commands/ScaleCommand";
import { SetCommand } from "./commands/SetCommand";
import { DeleteCommand } from "./commands/DeleteCommand";
import { AddToCommand } from "./commands/AddToCommand";
import { GroupCommand } from "./commands/GroupCommand";
import { UngroupCommand } from "./commands/UngroupCommand";
import { FrontCommand } from "./commands/FrontCommand";
import { BackCommand } from "./commands/BackCommand";
import { UndoCommand } from "./commands/UndoCommand";
import { RedoCommand } from "./commands/RedoCommand";
import { SaveCommand } from "./commands/SaveCommand";
import { ReadCommand } from "./commands/ReadCommand";

import { ShapeFactory } from "./model/ShapeFactory";
import { SvgFileWriter } from "./infrastructure/SvgFileWriter";
import { SvgFileReader } from "./infrastructure/SvgFileReader";
import { SvgXmlParser } from "./infrastructure/SvgXmlParser";

const session = new EditorSession();
const history = new CommandHistory(session);
const factory = new ShapeFactory();

const writer = new SvgFileWriter();
const reader = new SvgFileReader(new SvgXmlParser(factory));

const commands = new Map<string, Command>([
    ["init", new InitCommand(session, history)],
    ["canvas", new CanvasCommand(session, history)],
    [
        "create",
        new HistoryEditCommand(
            new CreateCommand(session, factory),
            history,
        ),
    ],
    ["show", new ShowCommand(session)],
    ["tree", new TreeCommand(session)],
    ["move", new HistoryEditCommand(new MoveCommand(session), history)],
    ["scale", new HistoryEditCommand(new ScaleCommand(session), history)],
    ["set", new HistoryEditCommand(new SetCommand(session), history)],
    ["delete", new HistoryEditCommand(new DeleteCommand(session), history)],
    ["addto", new HistoryEditCommand(new AddToCommand(session), history)],
    ["group", new HistoryEditCommand(new GroupCommand(session), history)],
    [
        "ungroup",
        new HistoryEditCommand(new UngroupCommand(session), history),
    ],
    ["front", new HistoryEditCommand(new FrontCommand(session), history)],
    ["back", new HistoryEditCommand(new BackCommand(session), history)],
    ["undo", new UndoCommand(history)],
    ["redo", new RedoCommand(history)],
    ["save", new SaveCommand(session, writer, history)],
    ["read", new ReadCommand(session, reader, history)],
]);

const application = new CliApplication(commands);
application.run();