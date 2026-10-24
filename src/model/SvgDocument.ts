import { Shape } from "./Shape";
export class SvgDocument {
    private width: number;
    private height: number;
    private readonly shapes: Map<string, Shape> = new Map();

    public constructor(width = 800, height = 600) {
        this.validateSize(width, height);
        this.width = width;
        this.height = height;
    }

    public getWidth(): number {
        return this.width;
    }

    public getHeight(): number {
        return this.height;
    }

    public resize(width: number, height: number): void {
        // 先全部校验，再修改，确保失败时原状态不变。
        this.validateSize(width, height);
        this.width = width;
        this.height = height;
    }

    private validateSize(width: number, height: number): void {
        if (
            !Number.isFinite(width) ||
            !Number.isFinite(height) ||
            width <= 0 ||
            height <= 0
        ) {
            throw new Error("canvas dimensions must be positive finite numbers");
        }
    }

    public addShape(shape: Shape): void {
        const id = shape.getId();

        if (this.shapes.has(id)) {
            throw new Error(`id already exists: ${id}`);
        }

        this.shapes.set(id, shape);
    }

    public getShape(id: string): Shape {
        const shape = this.shapes.get(id);

        if (shape === undefined) {
            throw new Error(`no such shape: ${id}`);
        }

        return shape;
    }

    public getShapes(): readonly Shape[] {
        return Array.from(this.shapes.values());
    }

    public clone(): SvgDocument {
        const copy = new SvgDocument(this.width, this.height);

        for (const shape of this.shapes.values()) {
            copy.addShape(shape.clone());
        }

        return copy;
    }

    public removeShape(id: string): Shape {
        const shape = this.getShape(id);
        this.shapes.delete(id);
        return shape;
    }
}