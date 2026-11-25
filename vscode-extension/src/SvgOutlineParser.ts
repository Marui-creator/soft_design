import { SaxesParser } from "saxes";

/** UTF-16 偏移与 TextDocument.positionAt 使用相同的计数单位。 */
export interface SvgOutlineNode {
  name: string;
  start: number;
  end: number;
  nameStart: number;
  nameEnd: number;
  children: SvgOutlineNode[];
}

/** 只读解析当前缓冲区；不完整 XML 返回空树，不保留上次的过期结果。 */
export class SvgOutlineParser {
  public parse(source: string): SvgOutlineNode[] {
    const roots: SvgOutlineNode[] = [];
    const stack: SvgOutlineNode[] = [];
    const parser = new SaxesParser({ xmlns: false, position: true });
    let invalid = false;

    parser.on("error", () => { invalid = true; });
    parser.on("opentag", (tag) => {
      const start = source.lastIndexOf("<", parser.position - 1);
      const id = tag.attributes.id;
      const node: SvgOutlineNode = {
        name: id ? `${tag.name}#${id}` : tag.name,
        start,
        end: parser.position,
        nameStart: start + 1,
        nameEnd: start + 1 + tag.name.length,
        children: [],
      };
      const parent = stack[stack.length - 1];
      (parent ? parent.children : roots).push(node);
      stack.push(node);
    });
    parser.on("closetag", () => {
      const node = stack.pop();
      if (node) node.end = parser.position;
    });

    try {
      parser.write(source).close();
      if (invalid || stack.length !== 0 || roots.length !== 1) return [];
      const rootName = roots[0]!.name.split("#")[0]!;
      return rootName.split(":").pop() === "svg" ? roots : [];
    } catch {
      return [];
    }
  }
}
