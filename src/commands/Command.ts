export interface Command {
  execute(args: readonly string[]): string;
}