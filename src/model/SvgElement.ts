export class SvgElement {
    private readonly attributes: Map<string, string> = new Map();
    private readonly children: SvgElement[] = [];
    private text: string | undefined;

    public constructor(private readonly tag: string) { }

    public setAttribute(
        name: string,
        value: string | number,
    ): void {
        this.attributes.set(name, String(value));
    }

    public setText(text: string): void {
        this.text = text;
    }

    public addChild(child: SvgElement): void {
        this.children.push(child);
    }

    public toXml(): string {
        const attributes = Array.from(this.attributes)
            .map(
                ([name, value]) =>
                    ` ${name}="${SvgElement.escape(value)}"`,
            )
            .join("");

        if (this.text === undefined && this.children.length === 0) {
            return `<${this.tag}${attributes}/>`;
        }

        const content =
            (this.text === undefined ? "" : SvgElement.escape(this.text)) +
            this.children.map((child) => child.toXml()).join("");

        return `<${this.tag}${attributes}>${content}</${this.tag}>`;
    }

    private static escape(value: string): string {
        return value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");
    }
}