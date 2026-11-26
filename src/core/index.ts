/** 插件公共 API：扩展只依赖接口和公开领域对象，不导入宿主或注册表实现。 */
export type * from "./extensions";
export type { DirectoryEntry, DirectoryReader } from "./DirectoryReader";
export { Shape } from "../model/Shape";
export { Group } from "../model/Group";
export { SvgElement } from "../model/SvgElement";
export { SvgDocument } from "../model/SvgDocument";
export type { Command } from "../commands/Command";
export { EditorSession } from "../commands/EditorSession";
export { CommandHistory } from "../commands/CommandHistory";
export { ShapeFactory } from "../model/ShapeFactory";
export { DocumentReadResult } from "../commands/DocumentReadResult";
export type { DocumentReader } from "../commands/DocumentReader";
export type { DocumentWriter } from "../commands/DocumentWriter";
