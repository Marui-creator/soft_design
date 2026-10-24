import { Shape } from "./Shape";

export class SvgDocument {
    private width: number;
    private height: number;

    // 这里只保存根级图形；子图形由各个 Group 保存。
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
        this.validateSize(width, height);

        this.width = width;
        this.height = height;
    }

    public addShape(shape: Shape, parentId?: string): void {
        if (shape.getParentId() !== undefined) {
            throw new Error("detach shape from its parent first");
        }

        // 检查待加入子树中的全部 ID，保证全文档唯一。
        const incomingIds = new Set<string>();
        this.validateIncoming(shape, incomingIds);

        if (parentId === undefined) {
            this.shapes.set(shape.getId(), shape);
            return;
        }

        const parent = this.getContainer(parentId);
        parent.addChild(shape);
    }

    public getShape(id: string): Shape {
        const shape = this.findShape(id);

        if (shape === undefined) {
            throw new Error(`no such shape: ${id}`);
        }

        return shape;
    }

    public getContainer(id: string): Shape {
        const shape = this.findShape(id);

        if (shape === undefined) {
            throw new Error(`no such container: ${id}`);
        }

        if (!shape.isContainer()) {
            throw new Error(`not a container: ${id}`);
        }

        return shape;
    }

    public getShapes(): readonly Shape[] {
        return Array.from(this.shapes.values());
    }

    public removeShape(id: string): Shape {
        const shape = this.getShape(id);
        const parentId = shape.getParentId();

        if (parentId === undefined) {
            this.shapes.delete(id);
            return shape;
        }

        return this.getContainer(parentId).removeChild(id);
    }

    public clone(): SvgDocument {
        const copy = new SvgDocument(this.width, this.height);

        for (const shape of this.shapes.values()) {
            copy.addShape(shape.clone());
        }

        return copy;
    }

    private findShape(id: string): Shape | undefined {
        for (const root of this.shapes.values()) {
            const found = this.findInSubtree(root, id);

            if (found !== undefined) {
                return found;
            }
        }

        return undefined;
    }

    private findInSubtree(
        shape: Shape,
        id: string,
    ): Shape | undefined {
        if (shape.getId() === id) {
            return shape;
        }

        for (const child of shape.getChildren()) {
            const found = this.findInSubtree(child, id);

            if (found !== undefined) {
                return found;
            }
        }

        return undefined;
    }

    private validateIncoming(
        shape: Shape,
        incomingIds: Set<string>,
    ): void {
        const id = shape.getId();

        if (incomingIds.has(id) || this.findShape(id) !== undefined) {
            throw new Error(`id already exists: ${id}`);
        }

        incomingIds.add(id);

        for (const child of shape.getChildren()) {
            this.validateIncoming(child, incomingIds);
        }
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

    public addTo(containerId: string, id: string): void {
        // 先检查目标和图形，再修改关系。
        this.getContainer(containerId);
        const shape = this.getShape(id);

        if (shape.containsId(containerId)) {
            throw new Error(
                `cannot move a container into its own descendant: ${id}`,
            );
        }

        this.removeShape(id);
        this.addShape(shape, containerId);
    }
}