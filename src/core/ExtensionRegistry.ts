import type { AttributeHandler, CommandContribution, ExtensionReader,
    ShapeProvider, TreeDecorator } from "./extensions";

export class ExtensionRegistry implements ExtensionReader {
    private readonly shapes = new Map<string, ShapeProvider>();
    private readonly commands = new Map<string, CommandContribution>();
    private readonly decorators = new Map<string, TreeDecorator>();
    private readonly attributes = new Map<string, AttributeHandler>();

    public registerShape(name: string, provider: ShapeProvider): void {
        if (provider.type !== name || typeof provider.create !== "function" ||
            typeof provider.canRead !== "function" || typeof provider.read !== "function" ||
            (provider.readPriority !== undefined && !Number.isFinite(provider.readPriority))) {
            throw new Error(`invalid extension: shapes/${name}`);
        }
        this.add(this.shapes, "shapes", name, provider);
    }
    public registerCommand(name: string, command: CommandContribution): void {
        if (command.name !== name || typeof command.execute !== "function" ||
            typeof command.help !== "string" || !command.help ||
            typeof command.section !== "string" || !command.section) {
            throw new Error(`invalid extension: commands/${name}`);
        }
        this.add(this.commands, "commands", name, command);
    }
    public registerDecorator(name: string, decorator: TreeDecorator): void {
        if (typeof decorator.decorate !== "function") throw new Error(`invalid extension: decorators/${name}`);
        this.add(this.decorators, "decorators", name, decorator);
    }
    public registerAttribute(name: string, handler: AttributeHandler): void {
        if (typeof handler.handles !== "function" || typeof handler.apply !== "function") {
            throw new Error(`invalid extension: attributes/${name}`);
        }
        this.add(this.attributes, "attributes", name, handler);
    }
    private add<T>(map: Map<string, T>, category: string, name: string, value: T): void {
        if (!name || name.trim() !== name) throw new Error(`invalid extension name: ${category}/${name}`);
        if (map.has(name)) throw new Error(`duplicate registration: ${category}/${name}`);
        map.set(name, value);
    }
    public getShapes(): readonly ShapeProvider[] { return [...this.shapes.values()]; }
    public getCommands(): readonly CommandContribution[] { return [...this.commands.values()]; }
    public getDecorators(): readonly TreeDecorator[] { return [...this.decorators.values()]; }
    public getAttributes(): readonly AttributeHandler[] { return [...this.attributes.values()]; }
    public names(): Record<"shapes" | "commands" | "decorators" | "attributes", string[]> {
        return { shapes: [...this.shapes.keys()], commands: [...this.commands.keys()],
            decorators: [...this.decorators.keys()], attributes: [...this.attributes.keys()] };
    }
    public fork(): ExtensionRegistry {
        const copy = new ExtensionRegistry();
        copy.commit(this);
        return copy;
    }
    public commit(staged: ExtensionRegistry): void {
        for (const [name, value] of staged.shapes) this.shapes.set(name, value);
        for (const [name, value] of staged.commands) this.commands.set(name, value);
        for (const [name, value] of staged.decorators) this.decorators.set(name, value);
        for (const [name, value] of staged.attributes) this.attributes.set(name, value);
    }
}
