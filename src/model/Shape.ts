export abstract class Shape {
    private readonly id: string;

    protected constructor(id: string) {
        if (id.trim().length === 0) {
            throw new Error("shape id must not be empty");
        }

        this.id = id;
    }

    public getId(): string {
        return this.id;
    }

    public abstract move(dx: number, dy: number): void;

    public abstract scale(factor: number): void;

    public abstract describe(): string;

    public abstract clone(): Shape;
    
    public abstract setAttribute(name: string, value: string): void;
}