---
noteId: "d9b27a90e9ae11f185a7b5fa6e6e8700"
tags: []

---

# 未保存变化标签 modified-star

源码：`src/plugins/tree-star/index.ts`，包名 `@svgframe/plugin-tree-star`。
默认导出 TreeStarPlugin 类，贡献 decorators: [modified-star]，实现类为
ModifiedStarDecorator。只依赖内核公开类型，不导入其他插件或宿主。

## 运行

```powershell
npm run cli
# 同一插件集合的配置方式
npm run cli -- --config plugins.config.json
# 保留 box、stats、dir，单独不加载星号插件
npm run cli -- --config plugins.box.config.json
# 所有可选插件均关闭，原有输出
npm run cli -- --no-plugins
```

在 CLI 输入（示例会在当前目录生成 star-demo.svg）：

```text
init 800 600
create box n1 120 100 160 60 "开始"
tree
save star-demo.svg
tree
set n1 fill #f5a623
tree
undo
tree
redo
tree
```

新建后 box 行末为 `(box) *`。保存后只保留 `(box)`。修改 fill 后矩形、box 和根行
出现 `*`，未改变的标题行不出现；一次 undo 回到保存点后这些 `*` 消失。
redo 后恢复。标签只是终端附加信息，不写入 SVG。

## ADR-007：内容比较、祖先传播与顺序

dirty 采用“当前模型内容与最近一次成功 save/read 的保存点不一致”，不采用
“曾经执行过编辑命令”。比较公开的模型序列化结果，忽略原磁盘文件的排版空白；
节点额外比较 parentId，以标记内容不变但被移到其他容器的节点。

| 状态或变化 | 标签行为 |
| --- | --- |
| init 后尚未保存 | 根和全部新节点立即标记，包括空的新画布 |
| 子节点属性或内容改变 | 该节点、含它的祖先容器及根标记 |
| 新增或删除子节点 | 新节点及相应祖先标记；已不存在的节点不渲染 |
| 移到另一容器 | 被移动节点、新旧父容器及祖先标记，未变子部件不标记 |
| 同级顺序变化 | 顺序所属容器/根标记，序列化与归属未变的叶子不标记 |
| 画布尺寸变化 | 根标记，未变节点不标记 |
| 成功 save/read | 保存点更新，标记清空 |
| save/read 或编辑失败 | 保存点不变，文档回滚后标记保持原状 |
| undo 回到保存点 | 标记消失；redo 离开保存点后再次出现 |
| 不通过 undo 而将内容改回保存值 | 同样消失，因为没有记忆编辑事件 |

TreeDecorator.decorate 从已有 TreeLineContext 获取 document、savedDocument 和 shape。
savedDocument 是宿主提供的防御性快照，shape 为 undefined 表示根行。
标签只返回 `*` 或空字符串，不修改活动文档、保存点或历史。

标签自己维护的保存点 XML 字符串和 ID→子树/parentId 索引，都封装在该实例的
baselineXml、savedShapes 字段里，没有模块级可变状态。保存点内容变化时重建索引，
init 没有保存点时清空；不会因另一个会话或另一个标签实例改变而污染状态。
子树内容比较自然传播到祖先，无需监听每种编辑命令或给内核增加事件分支。

标签拼接沿用注册顺序。默认先注册 box-type-label，再注册 modified-star，因此
显示 `(box) *`。两者不互相导入或调用；反向注册时自然显示 `* (box)`，由测试验证。
renderer 与 TreeCommand 在本次接入中没有修改。

## 开闭原则和改动边界

起点是 box PR 的合并提交 6630a1c。运行源码只新增 src/plugins/tree-star 包，并
在 src/host/codePlugins.ts 加入实例化；配置只在根列表加入模块，以及在全部禁用
示例中增加 enabled: false。没有修改内核、加载器、TreeCommand、box 或旧插件。

插件提交后令 C 为接入提交，检查：

```powershell
git diff --name-status C^ C
git diff C^ C -- src/core src/model src/cli src/commands src/infrastructure src/host/plugins src/plugins/builtin-commands src/plugins/builtin-shapes src/plugins/stats src/plugins/dir src/plugins/box
```

这些目录均实际存在。第二条应为空，且新增 tree-star 包已被排除。

## 验证材料

```powershell
npm test
node --test test/tree-star.test.cjs
npm run test:assembly
npm run test:compat
node scripts/verify-box-boundaries.cjs
```

2026-11-26：58 项测试通过。独立单测使用公开领域对象和叶子替身，不依赖其他
插件；覆盖编辑→保存→再编辑→undo→redo、父级传播、增删、归属变化、顺序、
画布尺寸、保存点切换、上下文不变和实例隔离。集成测试使用真实 box、会话和
undo/redo，另测成功/失败的保存读入、结构保护错误、两标签注册顺序及旧输出。

cli-tree-star.txt 为可重复会话，预期在 expected/assembly/cli-tree-star.stdout.txt。
默认装配增加标签后，其他双装配日志也相应更新；不修改 final 的无插件预期。
六组 A/B 会话 stdout 与保存 SVG 逐字节一致，Phase 1 三组基线仍逐字节一致。
expected/no-star/cli-box.stdout.txt 保留接入前真实 box 输出；单独关闭星号插件后
必须逐字节匹配，证明标签可独立禁用。

plugins.box.config.json 是前一阶段的三插件配置，刻意不含 modified-star，适合
CLI 单独关闭星号；默认双装配脚本须使用与代码装配一致的根四插件配置。

AI 协作检查：没有扩张内核的 dirty 字段或在编辑命令里硬编码标记；在内容比较之外
检查归属变化，避免移动到另一容器时漏标节点；缓存按实例持有并在 init 时清空；
保留旧日志验证禁用行为，而不是仅通过重新录制新快照判定测试成功。
