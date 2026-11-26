import type { Command } from "../commands/Command";
import type { Shape } from "../model/Shape";
import type { SvgDocument } from "../model/SvgDocument";
import type { SvgElement } from "../model/SvgElement";

export interface ShapeReadContext { read(element: SvgElement): Shape; }
export interface ShapeProvider {
    readonly type: string;
    /** 读回匹配优先级；最高优先级仍多重命中则拒绝。 */
    readonly readPriority?: number;
    create(args: readonly string[]): Shape;
    canRead(element: SvgElement): boolean;
    read(element: SvgElement, context: ShapeReadContext): Shape;
}
export interface CommandContribution extends Command {
    readonly name: string;
    readonly help: string;
    readonly section: string;
}
export interface TreeLineContext {
    readonly document: SvgDocument;
    readonly savedDocument: SvgDocument | undefined;
    /** 根标题行是 undefined。 */
    readonly shape: Shape | undefined;
}
export interface TreeDecorator {
    /** 不含分隔空格；按注册顺序拼接，空字符串表示无标签。 */
    decorate(context: TreeLineContext): string;
}
export interface AttributeContext {
    readonly document: SvgDocument;
    readonly shape: Shape;
}
export interface AttributeHandler {
    /** 纯判定；多个命中一律报错。 */
    handles(context: AttributeContext, attribute: string): boolean;
    /** 由 set 所在编辑事务负责撤销与失败回滚。 */
    apply(context: AttributeContext, attribute: string, value: string): void;
}
export interface ExtensionReader {
    getShapes(): readonly ShapeProvider[];
    getCommands(): readonly CommandContribution[];
    getDecorators(): readonly TreeDecorator[];
    getAttributes(): readonly AttributeHandler[];
}
export interface PluginContext {
    readonly editor: EditorAccess;
    createShape(type: string, args: readonly string[]): Shape;
    registerShape(name: string, provider: ShapeProvider): void;
    registerCommand(name: string, command: CommandContribution): void;
    registerDecorator(name: string, decorator: TreeDecorator): void;
    registerAttribute(name: string, handler: AttributeHandler): void;
}
export interface EditorAccess {
    getDocument(): SvgDocument;
    /** 返回副本，供标签比较保存点，不允许插件修改保存点。 */
    getSavedDocument(): SvgDocument | undefined;
}
export interface PluginServices {
    readonly editor: EditorAccess;
    createShape(type: string, args: readonly string[]): Shape;
}
export interface PluginManifest {
    shapes?: readonly string[];
    commands?: readonly string[];
    decorators?: readonly string[];
    attributes?: readonly string[];
}
export interface Plugin {
    readonly name: string;
    readonly contributes: PluginManifest;
    activate(context: PluginContext, options?: unknown): void;
}
