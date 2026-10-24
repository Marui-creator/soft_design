import { Command } from "./Command";
import { EditorSession } from "./EditorSession";
import { ShapeFactory } from "../model/ShapeFactory";

export class CreateCommand implements Command {
    public constructor(
        private readonly session: EditorSession,
        private readonly factory: ShapeFactory,
    ) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();
        const [type, ...remaining] = args;

        if (type === undefined) {
            throw new Error("usage: create <type> <id> [params...]");
        }

        let parentId: string | undefined;
        let shapeArgs = remaining;

        // in 子句必须位于命令末尾，形式为：in <containerId>
        if (
            remaining.length >= 3 &&
            remaining[remaining.length - 2] === "in"
        ) {
            parentId = remaining[remaining.length - 1]!;
            shapeArgs = remaining.slice(0, -2);

            // 创建前先确认目标存在且为容器。
            document.getContainer(parentId);
        }

        const shape = this.factory.create(type, shapeArgs);
        document.addShape(shape, parentId);

        const destination =
            parentId === undefined ? "" : ` in g#${parentId}`;

        return `${type}#${shape.getId()} created${destination}`;
    }
}