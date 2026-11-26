import { Group, Shape, SvgElement } from "../../core";

/** 组合一个通用 Group，保留其样式顺序、克隆与容器行为，并保护必要部件。 */
export class BoxShape extends Shape {
    private readonly body: Shape;
    private readonly title: Shape;

    public constructor(private readonly contents: Group) {
        super(contents.getId());
        const children = contents.getChildren();
        const body = children.find((child) => child.getId() === `${this.getId()}-rect`);
        const title = children.find((child) => child.getId() === `${this.getId()}-label`);
        if (!body || body.isContainer() || body.toSvgElement().getTag() !== "rect" ||
            !title || title.isContainer() || title.toSvgElement().getTag() !== "text") {
            throw new Error(`invalid box: ${this.getId()} (requires rect#${this.getId()}-rect and text#${this.getId()}-label)`);
        }
        this.body = body;
        this.title = title;
        super.setParentId(contents.getParentId());
        super.setTransform(contents.getTransform());
    }

    public isContainer(): boolean { return true; }
    public getLabel(): string { return `box#${this.getId()}`; }
    public getChildren(): readonly Shape[] { return this.contents.getChildren(); }
    public containsId(id: string): boolean { return this.contents.containsId(id); }
    public addChild(shape: Shape): void { this.contents.addChild(shape); }
    public insertChild(index: number, shape: Shape): void { this.contents.insertChild(index, shape); }

    public removeChild(id: string): Shape {
        if (id === this.body.getId() || id === this.title.getId()) {
            throw new Error(`cannot detach required box part: ${id}`);
        }
        return this.contents.removeChild(id);
    }

    public canUngroup(): boolean {
        // Policy hook may reject with a domain-specific error before any mutation.
        throw new Error(`cannot ungroup composite shape: ${this.getId()}`);
    }

    public setParentId(id: string | undefined): void {
        super.setParentId(id);
        this.contents.setParentId(id);
    }
    public setTransform(value: string | undefined): void {
        super.setTransform(value);
        this.contents.setTransform(value);
    }
    public move(dx: number, dy: number): void { this.contents.move(dx, dy); }
    public scale(factor: number): void { this.contents.scale(factor); }
    public setAttribute(name: string, value: string): void { this.contents.setAttribute(name, value); }
    public setBodyFill(value: string): void { this.body.setAttribute("fill", value); }
    public setTitle(value: string): void { this.title.setAttribute("text", value); }
    public describe(): string { return this.contents.describe(); }

    public clone(): BoxShape {
        const copy = new BoxShape(this.contents.clone());
        this.copyBaseTo(copy);
        return copy;
    }

    public toSvgElement(): SvgElement {
        const element = this.contents.toSvgElement();
        element.setAttribute("data-kind", "box");
        return element;
    }
}
