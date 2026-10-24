import { Shape } from "./Shape";
import { Group } from "./Group";
import { SvgElement } from "./SvgElement";

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

    public groupShapes(
        newId: string,
        ids: readonly string[],
    ): Group {
        if (ids.length === 0) {
            throw new Error("group requires at least one shape");
        }

        if (this.findShape(newId) !== undefined) {
            throw new Error(`id already exists: ${newId}`);
        }

        const selectedIds = new Set(ids);

        if (selectedIds.size !== ids.length) {
            throw new Error("duplicate shape id in group command");
        }

        const selected = ids.map((id) => this.getShape(id));

        // 不允许同时选择一个容器和它的子孙。
        for (const shape of selected) {
            for (const other of selected) {
                if (
                    shape !== other &&
                    shape.containsId(other.getId())
                ) {
                    throw new Error(
                        `cannot group a container into its own descendant: ${shape.getId()}`,
                    );
                }
            }
        }

        // 按原文档遍历顺序收集，避免输入参数顺序打乱同级顺序。
        const ordered: Shape[] = [];
        this.collectSelected(this.getShapes(), selectedIds, ordered);

        const group = new Group(newId);

        for (const shape of ordered) {
            this.removeShape(shape.getId());
            group.addChild(shape);
        }

        // 新组放到画布根级末尾。
        this.addShape(group);

        return group;
    }

    private collectSelected(
        shapes: readonly Shape[],
        selectedIds: ReadonlySet<string>,
        result: Shape[],
    ): void {
        for (const shape of shapes) {
            if (selectedIds.has(shape.getId())) {
                result.push(shape);
            }

            this.collectSelected(
                shape.getChildren(),
                selectedIds,
                result,
            );
        }
    }

    public ungroup(id: string): void {
        const group = this.getContainer(id);
        const parentId = group.getParentId();

        if (parentId === undefined) {
            throw new Error(`cannot ungroup top-level container: ${id}`);
        }

        const parent = this.getContainer(parentId);
        const index = parent.getChildren().findIndex(
            (child) => child.getId() === id,
        );

        if (index === -1) {
            throw new Error("inconsistent parent-child relationship");
        }

        const children = group.getChildren();

        for (const child of children) {
            child.inheritStylesFrom(group);
            child.prependTransform(group.getTransform());
        }

        this.removeShape(id);

        children.forEach((child, offset) => {
            group.removeChild(child.getId());
            parent.insertChild(index + offset, child);
        });
    }

    public bringToFront(id: string): void {
        this.reorderShape(id, true);
    }

    public sendToBack(id: string): void {
        this.reorderShape(id, false);
    }

    private reorderShape(id: string, toFront: boolean): void {
        const shape = this.getShape(id);
        const parentId = shape.getParentId();

        if (parentId !== undefined) {
            const parent = this.getContainer(parentId);

            parent.removeChild(id);

            const index = toFront ? parent.getChildren().length : 0;
            parent.insertChild(index, shape);

            return;
        }

        const siblings = this.getShapes().filter(
            (item) => item.getId() !== id,
        );

        if (toFront) {
            siblings.push(shape);
        } else {
            siblings.unshift(shape);
        }

        this.shapes.clear();

        for (const sibling of siblings) {
            this.shapes.set(sibling.getId(), sibling);
        }
    }

    public toSvgElement(): SvgElement {
        const root = new SvgElement("svg");

        root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        root.setAttribute("width", this.width);
        root.setAttribute("height", this.height);
        root.setAttribute(
            "viewBox",
            `0 0 ${this.width} ${this.height}`,
        );

        for (const shape of this.shapes.values()) {
            root.addChild(shape.toSvgElement());
        }

        return root;
    }
}