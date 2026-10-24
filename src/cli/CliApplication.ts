import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import { Command } from "../commands/Command";
import { EditorSession } from "../commands/EditorSession";
import { InitCommand } from "../commands/InitCommand";
import { CanvasCommand } from "../commands/CanvasCommand";
import { CreateCommand } from "../commands/CreateCommand";
import { ShapeFactory } from "../model/ShapeFactory";
import { ShowCommand } from "../commands/ShowCommand";

export class CliApplication {
  private readonly commands: ReadonlyMap<string, Command>;

  public constructor() {
    const session = new EditorSession();

    this.commands = new Map<string, Command>([
      ["init", new InitCommand(session)],
      ["canvas", new CanvasCommand(session)],
      ["create", new CreateCommand(session, new ShapeFactory())],
      ["show", new ShowCommand(session)],
    ]);
  }

  public run(): void {
    const terminal = createInterface({
      input: stdin,
      output: stdout,
      prompt: "svg> ",
    });

    console.log("svg-editor 0.1 — type 'help' for commands");
    terminal.prompt();

    terminal.on("line", (line: string) => {
      const input = line.trim();

      if (input.length === 0 || input.startsWith("#")) {
        terminal.prompt();
        return;
      }

  try {
    const [name, ...args] = input.split(/\s+/);

    if (name === "help") {
      if (args.length !== 0) {
        throw new Error("usage: help");
      }

      this.printHelp();
    } else {
      const command = this.commands.get(name!);

      if (command === undefined) {
        throw new Error(`unknown command: ${name}`);
      }

      console.log(command.execute(args));
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "unexpected error";
    console.log(`error: ${message}`);
  }

      terminal.prompt();
    });
  }

  private printHelp(): void {
    console.log(`文档：
  init [w] [h]
  read <file.svg>
  save [file.svg]
  canvas [w] [h]

图形编辑：
  create <type> <id> [params…] [in <containerId>]
  delete <id>
  move <id> <dx> <dy>
  scale <id> <factor>
  set <id> <attr> <value>
  group <newGid> <id1> <id2>…
  ungroup <gid>
  addto <gid> <id>
  front <id>
  back <id>

显示：
  tree [id]
  show <id>
  help

撤销重做：
  undo
  redo

当前仅实现 help，其余命令将在后续阶段加入。
按 Ctrl+C 退出。`);
  }
}