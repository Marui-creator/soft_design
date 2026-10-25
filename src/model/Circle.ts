import { Shape } from "./Shape";
import { SvgElement } from "./SvgElement";

export class Circle extends Shape {
    private cx: number;
    private cy: number;
    private r: number;
    private fill: string | undefined;
    private stroke: string | undefined;
    private strokeWidth: number | undefined;

    public constructor(
        id: string,
        cx: number,
        cy: number,
        r: number,
        fill?: string,
    ) {
        super(id);
        Circle.validateGeometry(cx, cy, r);

        this.cx = cx;
        this.cy = cy;
        this.r = r;
        this.fill = fill;
    }

    public move(dx: number, dy: number): void {
        const nextCx = this.cx + dx;
        const nextCy = this.cy + dy;

        Circle.validateGeometry(nextCx, nextCy, this.r);

        this.cx = nextCx;
        this.cy = nextCy;
    }

    public scale(factor: number): void {
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error("scale factor must be positive");
        }

        const nextCx = this.cx * factor;
        const nextCy = this.cy * factor;
        const nextR = this.r * factor;

        Circle.validateGeometry(nextCx, nextCy, nextR);

        this.cx = nextCx;
        this.cy = nextCy;
        this.r = nextR;
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
                const number = this.parseFiniteNumber(text);
                Circle.validateGeometry(number, this.cy, this.r);
                this.cx = number;
            }],
            ["cy", (text) => {
                const number = this.parseFiniteNumber(text);
                Circle.validateGeometry(this.cx, number, this.r);
                this.cy = number;
            }],
            ["r", (text) => {
                const number = this.parseFiniteNumber(text);
                Circle.validateGeometry(this.cx, this.cy, number);
                this.r = number;
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
            `circle#${this.getId()}  parent=${this.getParentDescription()}`,
            `  cx=${this.cx} cy=${this.cy} r=${this.r}`,
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

    public clone(): Circle {
        const copy = new Circle(
            this.getId(),
            this.cx,
            this.cy,
            this.r,
            this.fill,
        );

        copy.stroke = this.stroke;
        copy.strokeWidth = this.strokeWidth;

        this.copyBaseTo(copy);
        return copy;
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
        r: number,
    ): void {
        if (![cx, cy, r].every(Number.isFinite)) {
            throw new Error("geometry values must be finite numbers");
        }

        if (r < 0) {
            throw new Error("circle radius must not be negative");
        }
    }

    public toSvgElement(): SvgElement {
        return this.createSvgElement("circle", {
            cx: this.cx,
            cy: this.cy,
            r: this.r,
            fill: this.fill,
            stroke: this.stroke,
            "stroke-width": this.strokeWidth,
        });
    }
}