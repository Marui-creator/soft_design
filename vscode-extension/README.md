---
noteId: "23b27fd0e8a311f1ac1ea1c1bbbc2222"
tags: []

---

# SVG Phase 2 扩展

当前实现：Explorer 中为 SVG 文件添加 `[]` 装饰，不改变文件名或内容。
原生 Outline 大纲尚未实现。

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

`activate` 将提供者注册给 VSCode，VSCode 在显示资源时调用
`SvgFileDecorationProvider.provideFileDecoration`。提供者通过文件系统接口
检查资源类型并返回装饰数据，界面绘制由 VSCode 负责。

API 参考：<https://code.visualstudio.com/api/references/vscode-api#FileDecorationProvider>
