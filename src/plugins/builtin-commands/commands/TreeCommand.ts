import { Command } from "../../../core";
import { EditorSession } from "../../../core";
import { Shape } from "../../../core";
import type { ExtensionReader } from "../../../core";

export class TreeCommand implements Command {
    public constructor(private readonly session: EditorSession, private readonly extensions: ExtensionReader) { }

    public execute(args: readonly string[]): string {
        const document = this.session.getDocument();

        if (args.length > 1) {
            throw new Error("usage: tree [id]");
        }

        const lines: string[] = [];

        if (args.length === 1) {
            const shape = document.getShape(args[0]!);

            lines.push(this.formatLabel(shape));
            this.appendChildren(shape.getChildren(), "", lines);
        } else {
            lines.push(
                this.withTags(`svg (${document.getWidth()}x${document.getHeight()})`),
            );

            this.appendChildren(document.getShapes(), "", lines);
        }

        return lines.join("\n");
    }

    private appendChildren(
        children: readonly Shape[],
        prefix: string,
        lines: string[],
    ): void {
        children.forEach((shape, index) => {
            const isLast = index === children.length - 1;
            const branch = isLast ? "└── " : "├── ";

            lines.push(`${prefix}${branch}${this.formatLabel(shape)}`);

            const nextPrefix = prefix + (isLast ? "    " : "│   ");

            this.appendChildren(
                shape.getChildren(),
                nextPrefix,
                lines,
            );
        });
    }

    private formatLabel(shape: Shape): string {
        const [heading, ...details] = shape.describe().split("\n");
        const name = heading!.split("  parent=")[0]!;
        const parts = [
            name,
            ...details.map((line) => line.trim()),
        ];

        const transform = shape.getTransform();

        if (transform !== undefined) {
            parts.push(`transform=${JSON.stringify(transform)}`);
        }

        return this.withTags(parts.join(" "), shape);
    }

    private withTags(label: string, shape?: Shape): string {
        const context = { document: this.session.getDocument(), savedDocument: this.session.getSavedDocument(), shape };
        const tags = this.extensions.getDecorators().map((decorator) => {
            const tag = decorator.decorate(context);
            if (typeof tag !== "string" || /[\r\n]/.test(tag)) throw new Error("invalid tree decorator result");
            return tag;
        }).filter((tag) => tag.length > 0);
        return tags.length === 0 ? label : `${label} ${tags.join(" ")}`;
    }
}
