import type { PluginLoader } from "./plugins/PluginLoader";
import StatsPlugin from "../plugins/stats/index";
import DirPlugin from "../plugins/dir/index";
import BoxPlugin from "../plugins/box/index";

/** 可选插件的代码装配处；后续新增插件只修改本文件。 */
export function assembleOptionalPlugins(loader: PluginLoader): void {
    loader.loadInstance(new StatsPlugin());
    loader.loadInstance(new DirPlugin());
    loader.loadInstance(new BoxPlugin());
}
