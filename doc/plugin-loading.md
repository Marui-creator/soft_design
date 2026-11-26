---
noteId: "d15e7c90e97211f185a7b5fa6e6e8700"
tags: []

---

# 插件加载与目录访问基础设施

## 启动模式

`npm run cli` 先编译，再启动 `dist/main.js`，保证宿主与配置加载的插件使用同一套
已编译公共领域类，避免 tsx 源码类和 dist 类同时加载造成 instanceof 不一致。

```powershell
npm run cli
npm run cli -- --config plugins.config.json
npm run cli -- --no-plugins
```

不带参数走 `src/host/codePlugins.ts` 代码装配；`--config <path>` 只加载该配置指定的
可选插件，不额外加载代码装配列表；`--no-plugins` 只保留内置能力。
配置错误同样只保留内置能力，仍启动 CLI。

## 包与配置契约

配置结构为 `{ "plugins": [{ "module": "模块路径或包名", "enabled": true, "options": {} }] }`。
整个配置先做结构检查，避免后半段非法时前半段已经激活。options 是传入 activate
的原始 JSON 值，不做全局合并；具体选项由插件解释。enabled 缺省为 true，false
完全跳过解析与求值。按数组顺序加载。

插件包的 package.json 提供 name、main 和 contributes。contributes 支持 shapes、
commands、decorators、attributes 四类字符串名称数组，缺省为空。模块默认导出
带同步 activate(context, options) 的类或实例。配置装配以 package.json 的声明为准。
相对路径以配置文件目录为基准，包名按该目录的 Node 模块解析规则加载。
本地目录插件从该目录读取 package.json；文件路径或包入口向上寻找最近包清单。

PluginLoader 不导入具体插件，不包含插件名称映射。方式 A 的 loadInstance 与方式 B
的 loadModule 最终都调用 activatePlugin，使用同一注册、清单校验与回滚路径。

## 错误与继续运行

| 情况 | 输出 |
| --- | --- |
| 顶层模块解析失败 | error: plugin not found: &lt;module&gt; |
| 无 default 导出 | error: plugin has no default export: &lt;module&gt; |
| 清单不符 | error: plugin manifest mismatch: &lt;name&gt; (declared: …, registered: …) |
| 求值、依赖、构造或 activate 失败 | error: plugin failed to activate: &lt;name&gt; (&lt;reason&gt;) |
| 同类注册名重复 | error: duplicate registration: &lt;category&gt;/&lt;name&gt; |
| 配置缺失、语法或结构错误 | error: invalid plugin config |

模块解析与模块求值分开捕获，因此插件自身的缺失依赖不会误报为顶层插件不存在。
单个插件失败丢弃其暂存注册，保留成功插件并继续处理后续项。错误原因中的换行
压成空格，保持每条错误一行。主程序继续接收命令，不因可选插件失败退出。

## 目录访问适配器

`src/core/DirectoryReader.ts` 定义插件所需的 Target 接口：currentDirectory 与 read。
`src/infrastructure/NodeDirectoryReader.ts` 为 Adapter，将 Node fs/Dirent（Adaptee）
转换为 DirectoryEntry 的 name 与 kind。命令插件是 Client，只依赖 DirectoryReader。
宿主默认注入真实适配器，测试可以注入替身；A/B 均从同一 PluginContext.directories
获得接口。目录读取不递归，保留隐藏项；链接单独识别，不遍历其目标。

参考：[Node 文件系统 API](https://nodejs.org/api/fs.html) 与
[createRequire](https://nodejs.org/api/module.html#modulecreaterequirefilename)。

## 验证记录

2026-11-26：20 项测试通过，含框架 11 项、加载器 8 项、真实目录适配器 1 项。
模块加载测试包含独立临时包、node_modules 包名、相对配置目录、禁用插件、四类
失败、重复注册回滚、错误声明、依赖及语法失败，以及子进程继续接收 init/tree。
`npm run test:compat` 三组 stdout 和保存 SVG 与 final 逐字节一致。

基础设施提交本身不注册 stats/dir；后续命令插件阶段已完成二者，见
[命令插件](command-plugins.md)。接入只新增插件及修改代码装配处、配置、测试与文档，
没有再修改内核、加载器或既有插件。
