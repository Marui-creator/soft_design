import { Shape } from "./Shape";

export class Line extends Shape {
    private x1: number;
    private y1: number;
    private x2: number;
    private y2: number;
    private fill: string | undefined;
    private stroke: string | undefined;
    private strokeWidth: number | undefined;

    public constructor(
        id: string,
        x1: number,
        y1: number,
        x2: number,
        y2: number,
        stroke?: string,
    ) {
        super(id);
        Line.validateGeometry(x1, y1, x2, y2);

        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.stroke = stroke;
    }

    public move(dx: number, dy: number): void {
        this.updateGeometry(
            this.x1 + dx,
            this.y1 + dy,
            this.x2 + dx,
            this.y2 + dy,
        );
    }

    public scale(factor: number): void {
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error("scale factor must be positive");
        }

        this.updateGeometry(
            this.x1 * factor,
            this.y1 * factor,
            this.x2 * factor,
            this.y2 * factor,
        );
    }

    public setAttribute(name: string, value: string): void {
        const setters = new Map<string, (value: string) => void>([
            ["fill", (text) => { this.fill = text; }],
            ["stroke", (text) => { this.stroke = text; }],
            ["stroke-width", (text) => {
                const number = this.parseFiniteNumber(text);

                if (number < 0) {
                    throw new Error("stroke-width must not be negative");
                }

                this.strokeWidth = number;
            }],
            ["x1", (text) => {
                this.updateGeometry(
                    this.parseFiniteNumber(text), this.y1, this.x2, this.y2,
                );
            }],
            ["y1", (text) => {
                this.updateGeometry(
                    this.x1, this.parseFiniteNumber(text), this.x2, this.y2,
                );
            }],
            ["x2", (text) => {
                this.updateGeometry(
                    this.x1, this.y1, this.parseFiniteNumber(text), this.y2,
                );
            }],
            ["y2", (text) => {
                this.updateGeometry(
                    this.x1, this.y1, this.x2, this.parseFiniteNumber(text),
                );
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
            `line#${this.getId()}  parent=${this.getParentDescription()}`,
            `  x1=${this.x1} y1=${this.y1} x2=${this.x2} y2=${this.y2}`,
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

    public clone(): Line {
        const copy = new Line(
            this.getId(),
            this.x1,
            this.y1,
            this.x2,
            this.y2,
            this.stroke,
        );

        copy.fill = this.fill;
        copy.strokeWidth = this.strokeWidth;

        this.copyBaseTo(copy);
        return copy;
    }

    private updateGeometry(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
    ): void {
        Line.validateGeometry(x1, y1, x2, y2);

        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }

    private parseFiniteNumber(value: string): number {
        const number = Number(value);

        if (value.trim().length === 0 || !Number.isFinite(number)) {
            throw new Error("attribute value must be a finite number");
        }

        return number;
    }

    private static validateGeometry(
        x1: number,
        y1: number,
        x2: number,
        y2: number,
    ): void {
        if (![x1, y1, x2, y2].every(Number.isFinite)) {
            throw new Error("geometry values must be finite numbers");
        }
    }
}