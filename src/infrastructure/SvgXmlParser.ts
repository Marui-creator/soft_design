import { DOMParser, type Element as XmlElement } from "@xmldom/xmldom";
import { DocumentReadResult } from "../commands/DocumentReadResult";
import { SvgDocument } from "../model/SvgDocument";
import { SvgElement } from "../model/SvgElement";
import { ShapeFactory } from "../model/ShapeFactory";

export class SvgXmlParser {
    public constructor(private readonly factory: ShapeFactory) { }

    public parse(xml: string): DocumentReadResult {
        const root = this.parseXml(xml);

        if (root.getTag() !== "svg") {
            throw new Error("root element must be <svg>");
        }

        const width = this.readDimension(root, "width");
        const height = this.readDimension(root, "height");
        const document = new SvgDocument(width, height);

        this.checkViewBox(root, width, height);

        const usedIds = new Set<string>();
        this.collectIds(root, usedIds);

        const warnings: string[] = [];
        const counters = new Map<string, number>();

        for (const child of root.getChildren()) {
            this.assignIds(child, usedIds, counters, warnings);
        }

        for (const child of root.getChildren()) {
            document.addShape(this.factory.fromSvgElement(child));
        }

        return new DocumentReadResult(document, warnings);
    }

    private parseXml(xml: string): SvgElement {
        try {
            const parser = new DOMParser({
                onError: () => {
                    throw new Error("invalid XML");
                },
            });

            const document = parser.parseFromString(xml, "application/xml");
            const root = document.documentElement;

            if (root === null) {
                throw new Error("missing root");
            }

            return this.convertElement(root);
        } catch {
            throw new Error("invalid or unsupported SVG XML");
        }
    }

    private convertElement(source: XmlElement): SvgElement {
        if (
            source.namespaceURI !== null &&
            source.namespaceURI !== "" &&
            source.namespaceURI !== "http://www.w3.org/2000/svg"
        ) {
            throw new Error("unsupported XML namespace");
        }

        const element = new SvgElement(source.localName || source.tagName);

        for (let i = 0; i < source.attributes.length; i++) {
            const attribute = source.attributes.item(i)!;
            element.setAttribute(attribute.name, attribute.value);
        }

        let text = "";
        let hasText = false;

        for (let i = 0; i < source.childNodes.length; i++) {
            const node = source.childNodes.item(i)!;

            if (node.nodeType === 1) {
                element.addChild(this.convertElement(node as XmlElement));
            } else if (node.nodeType === 3 || node.nodeType === 4) {
                text += node.nodeValue ?? "";
                hasText = true;
            }
        }

        if (hasText) {
            element.setText(text);
        }

        return element;
    }

    private collectIds(
        element: SvgElement,
        usedIds: Set<string>,
    ): void {
        const id = element.getAttribute("id");

        if (id !== undefined && id.trim().length > 0) {
            if (usedIds.has(id)) {
                throw new Error(`id already exists: ${id}`);
            }

            usedIds.add(id);
        }

        for (const child of element.getChildren()) {
            this.collectIds(child, usedIds);
        }
    }

    private assignIds(
        element: SvgElement,
        usedIds: Set<string>,
        counters: Map<string, number>,
        warnings: string[],
    ): void {
        const existing = element.getAttribute("id");

        if (existing === undefined || existing.trim().length === 0) {
            const tag = element.getTag();
            let number = counters.get(tag) ?? 0;
            let id: string;

            do {
                number++;
                id = `${tag}${number}`;
            } while (usedIds.has(id));

            counters.set(tag, number);
            usedIds.add(id);
            element.setAttribute("id", id);

            warnings.push(`warning: assigned id ${id} to unnamed <${tag}>`);
        }

        for (const child of element.getChildren()) {
            this.assignIds(child, usedIds, counters, warnings);
        }
    }

    private readDimension(
        root: SvgElement,
        name: string,
    ): number {
        const value = root.getAttribute(name);

        if (
            value === undefined ||
            !/^\s*\+?(?:\d+(?:\.\d*)?|\.\d+)(?:px)?\s*$/.test(value)
        ) {
            throw new Error(`unsupported SVG ${name}: expected a number or px`);
        }

        return Number(value.trim().replace(/px$/, ""));
    }

    private checkViewBox(
        root: SvgElement,
        width: number,
        height: number,
    ): void {
        const value = root.getAttribute("viewBox");

        if (value === undefined) {
            return;
        }

        const parts = value.trim().split(/[\s,]+/).map(Number);

        if (
            parts.length !== 4 ||
            parts[0] !== 0 ||
            parts[1] !== 0 ||
            parts[2] !== width ||
            parts[3] !== height
        ) {
            throw new Error("this SVG viewBox is not supported yet");
        }
    }
}