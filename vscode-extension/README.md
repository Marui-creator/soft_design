---
noteId: "23b27fd0e8a311f1ac1ea1c1bbbc2222"
tags: []

---

# SVG Phase 2 扩展

当前实现：Explorer 中为 SVG 文件添加 `[]` 装饰，不改变文件名或内容。
同时提供原生 Outline：根元素、分组和叶子按源码顺序嵌套展示，
有 id 时显示 `标签名#id`，无 id 时显示标签名。

## 启动

1. 在此目录运行 `npm install`、`npm run typecheck` 和 `npm run build`。
2. 在 VSCode 中单独打开 `vscode-extension` 文件夹。
3. 按 F5，选择“运行 SVG 扩展”。编译任务会自动执行。
4. 新打开的 Extension Development Host 窗口会打开 examples 目录。
5. 检查 demo.svg 旁的 `[]`；plain.txt 和目录不应有标记。

若未显示标记，在开发宿主的设置中确认 `explorer.decorations.badges` 已启用。
可以新建一个名为 folder.svg 的目录，验证目录不会被标记。
截图应包含 Explorer 中的 SVG、普通文件和目录。

修改源码后重新按 F5，或在调试工具栏重启调试以加载最新代码。

## 对象职责

`SvgOutlineParser` 使用 saxes 解析 XML，记录元素的 UTF-16 起止偏移，
并构造独立于 VSCode 的层级树。`SvgDocumentSymbolProvider` 将其转换为
`DocumentSymbol`，完整元素范围用于层级定位，标签名范围用于点击跳转。
通过 `registerDocumentSymbolProvider` 注册到 `.svg` 路径，编辑器的语言模式
不影响匹配。VSCode 负责原生 Outline 界面、点击跳转以及编辑后的重新请求；
每次请求解析当前缓冲区，未保存的修改也能显示。XML 不完整时返回空树，
修复后下一次请求自动恢复。解析器不读取外部实体或修改文件。

`activate` 将提供者注册给 VSCode，VSCode 在显示资源时调用
`SvgFileDecorationProvider.provideFileDecoration`。提供者通过文件系统接口
检查资源类型并返回装饰数据，界面绘制由 VSCode 负责。

API 参考：<https://code.visualstudio.com/api/references/vscode-api#FileDecorationProvider>

## Outline 验证

先在普通 VSCode 中观察原生 Outline 的展开、定位与编辑更新行为，
再在开发宿主中执行以下步骤（2026-11-25 已完成手动验证，截图见项目 doc/README.md）：

1. 打开 examples/demo.svg 的文本编辑器，而非图像预览。
2. 展开 Explorer 底部的“大纲 / Outline”；如隐藏，可通过命令面板执行
   `View: Open View`，选择 Outline。
3. 展开 svg → g#flowchart，确认 rect#start 和 g#labels → text。
4. 点击 rect#start，应定位到第 3 行的 rect 标签；保存完整窗口截图。
5. 把 start 改成 start2，无须保存，稍等后大纲名称应更新。
6. 暂时删除末尾 </svg>，大纲应清空，扩展继续运行。
7. 恢复 </svg>，大纲应恢复；还原示例内容，并记录异常与恢复截图。

自动检查：`npm test`，覆盖嵌套分组、无 id、当前缓冲区编辑、错误输入后恢复、
源码范围、注释/CDATA/实体/Unicode 和取消请求。提供者使用 VSCode 测试替身；
真实宿主中的更新、点击和异常恢复已完成上述手动验证。

若点击大纲打开了图像预览，请关闭重复预览标签，并在工作区设置中添加
`"workbench.editorAssociations": { "*.svg": "default" }`。
示例目录的 `.vscode/settings.json` 已保留该设置，确保按 F5 打开的示例使用文本编辑器。
