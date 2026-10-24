import { Shape } from "./Shape";
import { SvgElement } from "./SvgElement";

export class Text extends Shape {
    private x: number;
    private y: number;
    private content: string;
    private fill: string | undefined;
    private stroke: string | undefined;
    private strokeWidth: number | undefined;

    public constructor(
        id: string,
        x: number,
        y: number,
        content: string,
    ) {
        super(id);
        Text.validatePosition(x, y);

        this.x = x;
        this.y = y;
        this.content = content;
    }

    public move(dx: number, dy: number): void {
        this.updatePosition(this.x + dx, this.y + dy);
    }

    public scale(factor: number): void {
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error("scale factor must be positive");
        }

        this.updatePosition(this.x * factor, this.y * factor);
    }

    public setAttribute(name: string, value: string): void {
        const setters = new Map<string, (value: string) => void>([
            ["text", (text) => { this.content = text; }],
            ["fill", (text) => { this.fill = text; }],
            ["stroke", (text) => { this.stroke = text; }],
            ["stroke-width", (text) => {
                const number = this.parseFiniteNumber(text);

                if (number < 0) {
                    throw new Error("stroke-width must not be negative");
                }

                this.strokeWidth = number;
            }],
            ["x", (text) => {
                this.updatePosition(this.parseFiniteNumber(text), this.y);
            }],
            ["y", (text) => {
                this.updatePosition(this.x, this.parseFiniteNumber(text));
            }],
        ]);

        const setter = setters.get(name);

        if (setter === undefined) {
            throw new Error(`unknown attribute: ${name}`);
        }

        setter(value);
    }

    public describe(): string {
        const lines = [
            `text#${this.getId()}  parent=${this.getParentDescription()}`,
            `  x=${this.x} y=${this.y}`,
            `  text=${JSON.stringify(this.content)}`,
        ];

        if (this.fill !== undefined) {
            lines.push(`  fill=${this.fill}`);
        }

        if (this.stroke !== undefined) {
            lines.push(`  stroke=${this.stroke}`);
        }

        if (this.strokeWidth !== undefined) {
            lines.push(`  stroke-width=${this.strokeWidth}`);
        }

        return lines.join("\n");
    }

    public clone(): Text {
        const copy = new Text(
            this.getId(),
            this.x,
            this.y,
            this.content,
        );

        copy.fill = this.fill;
        copy.stroke = this.stroke;
        copy.strokeWidth = this.strokeWidth;

        this.copyBaseTo(copy);
        return copy;
    }

    private updatePosition(x: number, y: number): void {
        Text.validatePosition(x, y);

        this.x = x;
        this.y = y;
    }

    private parseFiniteNumber(value: string): number {
        const number = Number(value);

        if (value.trim().length === 0 || !Number.isFinite(number)) {
            throw new Error("attribute value must be a finite number");
        }

        return number;
    }

    private static validatePosition(x: number, y: number): void {
        if (![x, y].every(Number.isFinite)) {
            throw new Error("geometry values must be finite numbers");
        }
    }

    public toSvgElement(): SvgElement {
        const element = this.createSvgElement("text", {
            x: this.x,
            y: this.y,
            fill: this.fill,
            stroke: this.stroke,
            "stroke-width": this.strokeWidth,
        });

        element.setText(this.content);

        return element;
    }
}