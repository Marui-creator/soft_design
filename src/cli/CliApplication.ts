import { createInterface } from "node:readline";
import { stdin, stdout } from "node:process";
import type { ExtensionReader } from "../core/extensions";
import { CommandParser } from "./CommandParser";

export class CliApplication {
    private readonly parser = new CommandParser();
    public constructor(private readonly extensions: ExtensionReader) { }
    public run(): void {
        const terminal = createInterface({ input: stdin, output: stdout, prompt: "svg> " });
        console.log("svg-editor 0.1 — type 'help' for commands");
        terminal.prompt();
        terminal.on("line", (line: string) => {
            const input = line.trim();
            if (input.length === 0 || input.startsWith("#")) {
                terminal.prompt();
                return;
            }
            try {
                const [name, ...args] = this.parser.parse(input);
                const command = this.extensions.getCommands().find((item) => item.name === name);
                if (!command) throw new Error(`unknown command: ${name}`);
                console.log(command.execute(args));
            } catch (error: unknown) {
                console.log(`error: ${error instanceof Error ? error.message : "unexpected error"}`);
            }
            terminal.prompt();
        });
    }
}
