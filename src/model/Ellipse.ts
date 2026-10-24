import { Shape } from "./Shape";

export class Ellipse extends Shape {
    private cx: number;
    private cy: number;
    private rx: number;
    private ry: number;
    private fill: string | undefined;
    private stroke: string | undefined;
    private strokeWidth: number | undefined;

    public constructor(
        id: string,
        cx: number,
        cy: number,
        rx: number,
        ry: number,
        fill?: string,
    ) {
        super(id);
        Ellipse.validateGeometry(cx, cy, rx, ry);

        this.cx = cx;
        this.cy = cy;
        this.rx = rx;
        this.ry = ry;
        this.fill = fill;
    }

    public move(dx: number, dy: number): void {
        this.updateGeometry(
            this.cx + dx,
            this.cy + dy,
            this.rx,
            this.ry,
        );
    }

    public scale(factor: number): void {
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error("scale factor must be positive");
        }

        this.updateGeometry(
            this.cx * factor,
            this.cy * factor,
            this.rx * factor,
            this.ry * factor,
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
            ["cx", (text) => {
                this.updateGeometry(
                    this.parseFiniteNumber(text), this.cy, this.rx, this.ry,
                );
            }],
            ["cy", (text) => {
                this.updateGeometry(
                    this.cx, this.parseFiniteNumber(text), this.rx, this.ry,
                );
            }],
            ["rx", (text) => {
                this.updateGeometry(
                    this.cx, this.cy, this.parseFiniteNumber(text), this.ry,
                );
            }],
            ["ry", (text) => {
                this.updateGeometry(
                    this.cx, this.cy, this.rx, this.parseFiniteNumber(text),
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
            `ellipse#${this.getId()}  parent=svg`,
            `  cx=${this.cx} cy=${this.cy} rx=${this.rx} ry=${this.ry}`,
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

    public clone(): Ellipse {
        const copy = new Ellipse(
            this.getId(),
            this.cx,
            this.cy,
            this.rx,
            this.ry,
            this.fill,
        );

        copy.stroke = this.stroke;
        copy.strokeWidth = this.strokeWidth;

        return copy;
    }

    private updateGeometry(
        cx: number,
        cy: number,
        rx: number,
        ry: number,
    ): void {
        Ellipse.validateGeometry(cx, cy, rx, ry);

        this.cx = cx;
        this.cy = cy;
        this.rx = rx;
        this.ry = ry;
    }

    private parseFiniteNumber(value: string): number {
        const number = Number(value);

        if (value.trim().length === 0 || !Number.isFinite(number)) {
            throw new Error("attribute value must be a finite number");
        }

        return number;
    }

    private static validateGeometry(
        cx: number,
        cy: number,
        rx: number,
        ry: number,
    ): void {
        if (![cx, cy, rx, ry].every(Number.isFinite)) {
            throw new Error("geometry values must be finite numbers");
        }

        if (rx < 0 || ry < 0) {
            throw new Error("ellipse radii must not be negative");
        }
    }
}