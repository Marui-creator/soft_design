---
noteId: "725cfbf0e9a811f185a7b5fa6e6e8700"
tags: []

---

# Box 复合图形插件

包：`@svgframe/plugin-shape-box`，源码位于 `src/plugins/box/`。
贡献 ShapeProvider `box`、AttributeHandler `box-attributes`、TreeDecorator
`box-type-label`，均通过类实现并经过宿主同一激活入口。

## 使用

```powershell
npm run cli
# 或配置装配（独立演示配置也适用于代码装配提交）
npm run cli -- --config plugins.box.config.json
```

```text
init 800 600
create box n1 120 100 160 60 "开始"
tree
set n1 fill #f5a623
undo
redo
set n1 label "处理数据 v2"
undo
redo
create box child 300 100 100 50 "嵌套" in n1
move n1 10 20
stats
ungroup n1
```

最后一条按约定输出 `error: cannot ungroup composite shape: n1`。
CLI 反馈复用现有命令模板，create 不额外列出子部件，undo/redo 仍使用统一反馈；
操作后的模型状态与 Phase 1 §6.1 版本 B 定义一致，不为示意反馈文案改动旧命令。
结构树显示 `g#n1 ... (box)`，子部件为 n1-rect、n1-label。

配置的 options 可传 `{ "fill": "orange" }` 修改创建时的默认框体色，缺省为 #4a90d9。
无 options 或空对象均可；非对象、非字符串 fill 或未知选项拒绝激活，注册整体回滚。
options 不改变已读入子部件的颜色。

## 设计与扩展点调用

BoxProvider 通过 PluginContext.createShape 请求 rect 和 text，不导入内置插件类。
标题初始坐标为 x+20、y+35，对应作业模板；尺寸允许零，拒绝负数与非有限值。
返回的 BoxShape 继承公开 Shape，并组合一个公开 Group，复用后者的层级、移动、
缩放、样式及克隆。Group 私有样式不被读取，原有样式插入顺序通过 Group.clone 保留。

BoxShape 只暴露公开领域方法 setBodyFill/setTitle。BoxAttributeHandler 的 handles
只检查类型与属性名，apply 调用这两个方法。一次 set 继续由既有历史装饰器包成
一个事务，无需内核或 SetCommand 的 box 分支。其他属性回退通用 Group 白名单，
未定义属性仍报 unknown attribute；普通 rect 不会因插件加载而接受 label。

BoxTypeDecorator 只负责 box 节点的 `(box)`，不标记普通分组、根或叶子，也不知道
后续 modified-star。TreeCommand 与渲染器未改动。modified-star 尚未实现。

## ADR-005：完整子树、ID 与子部件保护

创建时先在文档之外构建整个子树，再由 SvgDocument.addShape 检查全文档 ID。
派生 ID 固定为 `<id>-rect`、`<id>-label`。任一冲突均拒绝整条 create，不保留
容器或另一子部件；由现有事务恢复文档且保持 undo/redo 栈。

必要部件必须是 box 的直接子节点，ID 和类型都匹配；rect/text 都必须是叶子。
BoxShape.removeChild 拒绝分离这两个部件，所以 delete、addto、group、front/back
等普通命令不能破坏结构。即使 group 已先移动另一个选中节点，事务也整体回滚。
必要部件可以直接修改样式、文本或几何位置，其 ID 和类型仍固定。
额外子节点和嵌套 box 可正常添加、删除、移动。

BoxShape.canUngroup 使用现有策略钩子抛出精确的领域错误，因此根级和嵌套 box
都拒绝拆分。策略钩子允许通过异常解释拒绝原因，不改动核心的通用错误文案。
整体删除 box 作为一次编辑事务，撤销会恢复 BoxShape 类型及整个子树。

## ADR-006：序列化、损坏输入与缺插件降级

序列化为 `<g id="..." data-kind="box">`，子部件仍为标准 rect/text。
BoxProvider 的读回优先级为 100，高于普通 g 提供者的 0。
注册后凭 g + data-kind 识别，再通过递归上下文读入子节点，保留已存在的样式、
transform、文本与额外子节点。不得用新建模板覆盖读入数据。

缺失必要部件、部件类型或派生 ID 错误时，明确拒绝整个 read；不会构造半成品。
重复 ID 仍由全局检查拒绝。ReadCommand 在解析全部成功后才替换文档，所以错误
不改变原文档、保存路径、保存点或 undo/redo。

未安装 box 时普通 g 提供者自然接管，保留所有可支持的子图形，语义降级为普通
Group，不再有保护、label 便捷属性或 `(box)` 标签。再次保存会移除 data-kind 标记，
不承诺未来自动恢复 box 语义。这是明确的降级取舍。

XML 属性顺序不属于读回语义，沿用既有解析器的样式规范化顺序；测试比较完整
XML 结构和值。克隆/undo/redo 则保留操作前后的精确序列化状态。

## 独立测试与验证

```powershell
npm run typecheck
npm test
node --test test/box.test.cjs
npm run test:compat
npm run test:assembly -- --config plugins.box.config.json
```

独立单测只使用公开领域对象和替身 rect/text，不导入其他插件。
集成测试验证两次 set 各自一次 undo/redo、嵌套移动/缩放、整体删除、子树 ID 冲突、
必要部件保护、读回及降级、损坏输入与重复 ID、处理器冲突、部分修改抛错的事务
回滚、真实 stats 统计，以及 A/B 同 options 时注册集合和结果一致。

会话 cli-box.txt 复现 Phase 1 §6.1 版本 B；cli-box-boundaries.txt 额外验证嵌套、
读回、撤销与结构保护。expected/assembly/ 保存实际输出。五组 A/B 会话在相同的
固定临时目录下比较 stdout 和保存 SVG，日志不写入被 dir 列出的目录。

## A/B 接入过程

两条演示分支从相同的框架与命令阶段提交开始。
方式 A 的运行代码只新增 box 包并修改 src/host/codePlugins.ts。
方式 B 独立接入同一 box 包，只改 plugins.config.json，不修改既有运行源码。
最后合并两条演示历史，使常用代码入口与根配置都支持 box；不改动已有 tag。
提交哈希和可复核 diff 会在演示完成后记录到 box-evidence.md。

新增测试和会话脚本属于验证材料，独立演示配置用于 A 分支验证 B 路径；这些不
包含内核运行逻辑。命令 help 的预期输出多出 box 类型，原有无插件基线不更新。

AI 协作检查：选择组合 Group 避免复制其私有样式导致 clone 丢失顺序；通过现有
removeChild/canUngroup 策略保护结构，未为 box 修改内核；读回测试没有把 XML
属性顺序误当作语义，并保留撤销与双装配的逐字节检查。
