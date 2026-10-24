import { Shape } from "./Shape";

export class Group extends Shape {
    private readonly children: Shape[] = [];
    private readonly styles: Map<string, string> = new Map();

    public constructor(id: string) {
        super(id);
    }

    public getChildren(): readonly Shape[] {
        return [...this.children];
    }

    public addChild(shape: Shape): void {
        if (shape.containsId(this.getId())) {
            throw new Error("cannot create a circular group hierarchy");
        }

        if (this.containsId(shape.getId())) {
            throw new Error(`id already exists: ${shape.getId()}`);
        }

        const parentId = shape.getParentId();

        if (parentId !== undefined && parentId !== this.getId()) {
            throw new Error("detach shape from its parent first");
        }

        shape.setParentId(this.getId());
        this.children.push(shape);
    }

    public removeChild(id: string): Shape {
        const index = this.children.findIndex(
            (shape) => shape.getId() === id,
        );

        if (index === -1) {
            throw new Error(`no such shape: ${id}`);
        }

        const shape = this.children[index]!;
        this.children.splice(index, 1);
        shape.setParentId(undefined);

        return shape;
    }

    public containsId(id: string): boolean {
        return (
            super.containsId(id) ||
            this.children.some((shape) => shape.containsId(id))
        );
    }

    public move(dx: number, dy: number): void {
        if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
            throw new Error("move offsets must be finite numbers");
        }

        // 先在副本上检查全部子图形，避免中途失败后只移动一部分。
        for (const shape of this.children) {
            shape.clone().move(dx, dy);
        }

        for (const shape of this.children) {
            shape.move(dx, dy);
        }
    }

    public scale(factor: number): void {
        if (!Number.isFinite(factor) || factor <= 0) {
            throw new Error("scale factor must be positive");
        }

        for (const shape of this.children) {
            shape.clone().scale(factor);
        }

        for (const shape of this.children) {
            shape.scale(factor);
        }
    }

    public setAttribute(name: string, value: string): void {
        const allowed = new Set(["fill", "stroke", "stroke-width"]);

        if (!allowed.has(name)) {
            throw new Error(`unknown attribute: ${name}`);
        }

        if (name === "stroke-width") {
            const number = Number(value);

            if (
                value.trim().length === 0 ||
                !Number.isFinite(number) ||
                number < 0
            ) {
                throw new Error(
                    "stroke-width must be a non-negative finite number",
                );
            }

            this.styles.set(name, String(number));
            return;
        }

        this.styles.set(name, value);
    }

    public describe(): string {
        const lines = [
            `g#${this.getId()}  parent=${this.getParentDescription()}`,
            `  children=${this.children.length}`,
        ];

        for (const [name, value] of this.styles) {
            lines.push(`  ${name}=${value}`);
        }

        return lines.join("\n");
    }

    public clone(): Group {
        const copy = new Group(this.getId());

        for (const [name, value] of this.styles) {
            copy.styles.set(name, value);
        }

        for (const child of this.children) {
            copy.addChild(child.clone());
        }

        this.copyBaseTo(copy);

        return copy;
    }

    public isContainer(): boolean {
        return true;
    }
}