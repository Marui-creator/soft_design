import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";

export class CliApplication {
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

      if (input === "help") {
        this.printHelp();
      } else {
        console.log(`error: unknown command: ${input.split(/\s+/)[0]}`);
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