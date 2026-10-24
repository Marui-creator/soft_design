import { Shape } from "./Shape";

export class Rect extends Shape {
    private x: number;
    private y: number;
    private width: number;
    private height: number;
    private fill: string | undefined;
    private stroke: string | undefined;
    private strokeWidth: number | undefined;

    public constructor(
        id: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fill?: string,
    ) {
        super(id);
        Rect.validateGeometry(x, y, width, height);

        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.fill = fill;
    }

    public describe(): string {
        const lines = [
            `rect#${this.getId()}  parent=${this.getParentDescription()}`,
            `  x=${this.x} y=${this.y} width=${this.width} height=${this.height}`,
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

    public clone(): Rect {
        const copy = new Rect(
            this.getId(),
            this.x,
            this.y,
            this.width,
            this.height,
            this.fill,
        );

        copy.stroke = this.stroke;
        copy.strokeWidth = this.strokeWidth;

        this.copyBaseTo(copy);
        return copy;
    }

    public getX(): number {
        return this.x;
    }

    public getY(): number {
        return this.y;
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    public getFill(): string | undefined {
        return this.fill;
    }

    public move(dx: number, dy: number): void {
        const nextX = this.x + dx;
        const nextY = this.y + dy;

        Rect.validateGeometry(nextX, nextY, this.width, this.height);

        this.x = nextX;
        this.y = nextY;
    }

    public scale(factor: number): void {
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error("scale factor must be positive");
        }

        const nextX = this.x * factor;
        const nextY = this.y * factor;
        const nextWidth = this.width * factor;
        const nextHeight = this.height * factor;

        Rect.validateGeometry(nextX, nextY, nextWidth, nextHeight);

        this.x = nextX;
        this.y = nextY;
        this.width = nextWidth;
        this.height = nextHeight;
    }

    private static validateGeometry(
        x: number,
        y: number,
        width: number,
        height: number,
    ): void {
        if (![x, y, width, height].every(Number.isFinite)) {
            throw new Error("geometry values must be finite numbers");
        }

        if (width < 0 || height < 0) {
            throw new Error("rectangle dimensions must not be negative");
        }
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
            ["x", (text) => {
                const number = this.parseFiniteNumber(text);
                Rect.validateGeometry(number, this.y, this.width, this.height);
                this.x = number;
            }],
            ["y", (text) => {
                const number = this.parseFiniteNumber(text);
                Rect.validateGeometry(this.x, number, this.width, this.height);
                this.y = number;
            }],
            ["width", (text) => {
                const number = this.parseFiniteNumber(text);
                Rect.validateGeometry(this.x, this.y, number, this.height);
                this.width = number;
            }],
            ["height", (text) => {
                const number = this.parseFiniteNumber(text);
                Rect.validateGeometry(this.x, this.y, this.width, number);
                this.height = number;
            }],
        ]);

        const setter = setters.get(name);

        if (setter === undefined) {
            throw new Error(`unknown attribute: ${name}`);
        }

        setter(value);
    }

    private parseFiniteNumber(value: string): number {
        if (value.trim().length === 0) {
            throw new Error("attribute value must be a finite number");
        }

        const number = Number(value);

        if (!Number.isFinite(number)) {
            throw new Error("attribute value must be a finite number");
        }

        return number;
    }
}