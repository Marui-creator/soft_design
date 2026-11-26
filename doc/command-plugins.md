---
noteId: "d90d77e0e97511f185a7b5fa6e6e8700"
tags: []

---

# 命令插件：stats 与 dir

## 运行与禁用

保持在仓库根目录，执行以下任一启动方式：

```powershell
# A：顶层代码装配
npm run cli

# B：根配置装配，同样启用 stats、dir
npm run cli -- --config plugins.config.json

# 原有能力，所有新增插件关闭
npm run cli -- --no-plugins

# 通过 enabled: false 关闭两个插件
npm run cli -- --config plugins.disabled.config.json
```

CLI 交互示例：

```text
dir
init 800 600
create g flow
create rect r1 10 20 100 60 red in flow
create text t1 20 50 "开始" in flow
stats
help
```

最后统计为 `rect: 1  text: 1  (total 2, containers 1)`。
`dir` 在 init 前可用；未初始化时 stats 按原文档访问规则报错。
两条命令均不接受参数，错误分别为 `error: usage: stats` 和 `error: usage: dir`。

## 包与装配

| 包 | 源码 | 默认导出 | 贡献 |
| --- | --- | --- | --- |
| @svgframe/plugin-command-stats | src/plugins/stats | StatsPlugin 类 | commands: [stats] |
| @svgframe/plugin-command-dir | src/plugins/dir | DirPlugin 类 | commands: [dir] |

二者均独立于 builtin-commands 包，也不相互导入。执行接口实现为 StatsCommand、
DirCommand 类，名称、参数校验和 help 文案由对应类提供。
代码装配只在 `src/host/codePlugins.ts` 实例化插件，调用 PluginLoader.loadInstance；
配置装配根据 package.json 的 main 定位编译产物，以 contributes 为准，调用
同一 activatePlugin 注册与校验。代码类的声明与包声明一致性由测试核对。

源码包的 main 指向 `../../../dist/plugins/<包目录>/index.js`。首次运行应先构建，
`npm run cli` 会自动构建；直接 `node dist/main.js` 则需手动 `npm run build`。
包名安装也被加载器支持，但当前仓库示例使用本地源码包目录，无需发布 npm 包。
配置相对路径以配置文件目录为准，与启动 cwd 无关。

当前两个插件没有业务选项，options 不影响其输出；加载器仍原样传入 options，
该行为另由独立加载器测试验证。A/B 示例插件集合、顺序与 options 一致。

## stats 的规则

只通过 EditorAccess 获取当前文档，从根子节点按原顺序深度优先遍历。
容器只计入 containers，递归统计其叶子，根 svg 不计入。类型第一次出现时放入
Map，保持首次出现顺序。叶子类型使用 SVG 的 data-kind（若存在），否则标签名。
当前内置叶子分别是 rect、circle、ellipse、line、text。空文档输出
`(total 0, containers 0)`。容器扩展只需遵循 Shape.isContainer/getChildren，
无需修改统计命令；初次接入时通过容器替身验证，后续 box 阶段已用真实嵌套 box
验证 rect/text 叶子与 containers 的统计，StatsCommand 本身未修改。

## dir 与适配器模式

DirCommand 是 Client；DirectoryReader 是应用定义的 Target；NodeDirectoryReader
是 Adapter；Node fs.readdirSync 和 Dirent 是 Adaptee。命令只读取公开目录接口，
不导入 Node fs，也不访问编辑器、SVG 路径或历史对象。

宿主通过 PluginContext.directories 注入适配器，A/B 获得同一接口实现。
真实适配器的 currentDirectory 返回 CLI 进程 cwd；read/save 不调用 chdir。
read 返回 name/kind 领域数据，排序和显示由 DirCommand 决定。

直接子目录在前、文件在后，各组以 JavaScript UTF-16 字符串顺序比较名称，
区分大小写，不使用受语言环境影响的 localeCompare。包含隐藏项，剔除 . 和 ..。
符号链接在文件之后用 `[LINK]` 显示，其余特殊项最后用 `[OTHER]` 显示；均不递归
访问目标。四种标记之后统一两个空格。空目录为 `(empty directory)`。
read 抛错转换为 `cannot read directory: <cwd>`，由 CLI 添加 `error: ` 后继续。

两条命令都没有接入 HistoryEditCommand，不修改活动文档、保存点或 undo/redo；
也不触发或解除 IO 后的撤销限制。

## 验证命令与材料

```powershell
npm test
npm run test:compat
npm run test:assembly

# 插件独立测试，先 npm run build
node --test test/stats.test.cjs
node --test test/dir.test.cjs
```

2026-11-26：32 项测试通过。包括独立测试替身、真实目录组合、未初始化调用、
空目录、隐藏项、稳定排序、读取失败、成功/失败后文档与保存点不变、undo/redo
仍可执行、read/save 不改变 dir 目标、独立启用与禁用及失败后继续接收命令。

兼容性三组与 final 的 stdout/保存 SVG 逐字节一致。
scripts/verify-assembly.cjs 对基础会话、分组流程图、新增命令会话分别运行 A/B，
逐字节比较 stdout 与保存的 SVG，并核对提交的 expected/assembly 日志。
每次重置同一个临时工作目录为 docs/、plugins/、.hidden、notes.txt、other.svg，
输出保存在进程内存或仓库日志目录，不写进被 dir 列出的目录。
`--record` 只用于初次记录已核验输出，日常检查不加此选项。

## 开闭原则的提交边界

基础设施提交为 `83e16ce`：先完成 DirectoryReader、真实适配器、配置加载器、
公共服务注入及空的可选代码装配处，经过测试后提交。
后续命令插件接入只新增 stats/dir 包，已有运行代码只修改 codePlugins.ts。
加载器、核心、内置插件没有再修改。根 package.json 只新增双装配验证脚本，
其余变化为配置、测试和文档，不包含隐藏的运行逻辑。

插件提交完成后，令 C 为该提交，可检查：

```powershell
git diff --name-status C^ C
git diff C^ C -- src/core src/model src/cli src/commands src/infrastructure src/host/plugins src/plugins/builtin-commands src/plugins/builtin-shapes
```

这些路径均实际存在。第二条命令排除了新增包目录，应该为空。
本步展示命令的代码接入与配置运行一致性；后续 box 仍须额外保留 A/B 两次独立
接入提交，分别满足作业第 6 节的严格 diff 判据。

AI 协作修正：检查了源码包 main 指向编译产物后，TypeScript 的目录导入会优先
解析 package.json 并找到无声明 JS，因此代码装配改为显式导入源码 index；
配置仍通过包 main 加载编译产物。没有为解决这个问题硬编码加载器分支。
另外将独立单测与双插件集成测试分开，确保每个命令在没有其他插件时可测。
