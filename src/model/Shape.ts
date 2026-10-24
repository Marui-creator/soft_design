import { SvgElement } from "./SvgElement";

export abstract class Shape {
    private readonly id: string;
    private parentId: string | undefined;

    protected constructor(id: string) {
        if (id.trim().length === 0) {
            throw new Error("shape id must not be empty");
        }

        this.id = id;
    }

    public getId(): string {
        return this.id;
    }

    public getParentId(): string | undefined {
        return this.parentId;
    }

    public setParentId(parentId: string | undefined): void {
        if (parentId === this.id) {
            throw new Error("a shape cannot be its own parent");
        }

        this.parentId = parentId;
    }

    protected getParentDescription(): string {
        return this.parentId === undefined
            ? "svg"
            : `g#${this.parentId}`;
    }

    protected copyBaseTo(copy: Shape): void {
        copy.parentId = this.parentId;
    }

    public containsId(id: string): boolean {
        return this.getId() === id;
    }

    public isContainer(): boolean {
        return false;
    }

    public getChildren(): readonly Shape[] {
        return [];
    }

    public addChild(_shape: Shape): void {
        throw new Error(`not a container: ${this.getId()}`);
    }

    public removeChild(_id: string): Shape {
        throw new Error(`not a container: ${this.getId()}`);
    }

    public insertChild(_index: number, _shape: Shape): void {
        throw new Error(`not a container: ${this.getId()}`);
    }

    public abstract move(dx: number, dy: number): void;

    public abstract scale(factor: number): void;

    public abstract setAttribute(name: string, value: string): void;

    public abstract describe(): string;

    public abstract clone(): Shape;

    public abstract toSvgElement(): SvgElement;

    protected createSvgElement(
        tag: string,
        attributes: Readonly<Record<string, string | number | undefined>>,
    ): SvgElement {
        const element = new SvgElement(tag);
        element.setAttribute("id", this.getId());

        for (const [name, value] of Object.entries(attributes)) {
            if (value !== undefined) {
                element.setAttribute(name, value);
            }
        }

        return element;
    }

    public inheritStylesFrom(source: Shape): void {
        const sourceElement = source.toSvgElement();
        const ownElement = this.toSvgElement();

        for (const name of ["fill", "stroke", "stroke-width"]) {
            const inherited = sourceElement.getAttribute(name);
            const own = ownElement.getAttribute(name);

            if (
                inherited !== undefined &&
                (own === undefined || own === "inherit")
            ) {
                this.setAttribute(name, inherited);
            }
        }
    }
}