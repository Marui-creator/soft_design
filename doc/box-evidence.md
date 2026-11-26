---
noteId: "b77227e0e9aa11f185a7b5fa6e6e8700"
tags: []

---

# Box 独立接入证据

共同起点：8408426（框架与 stats/dir PR 的合并提交）。

| 方式 | 分支 | 接入提交 | 已有运行源码变化 |
| --- | --- | --- | --- |
| A：代码装配 | feat/box-plugin | 73939b8 | 只修改 src/host/codePlugins.ts |
| B：配置装配 | feat/box-plugin-config | d812658 | 无；仅根 plugins.config.json 增加 box 项 |

两次提交均直接以共同起点为父提交，新增的 src/plugins/box 三个文件完全一致。
合并提交 bde7b11 将两条历史合回 feat/box-plugin；未改 main，未推送，未改动 tag。

在项目根目录执行：

```powershell
node scripts/verify-box-boundaries.cjs
npm test
npm run test:assembly
npm run test:compat
```

边界脚本核验各保护路径实际存在，再检查两个接入提交及合并后状态：内核、加载器、
旧插件不变；A 只改一个已有装配源码，B 完全不改已有运行源码；插件源码及 A/B
配置的集合、顺序和 options 相同。只看空 diff 而不检查路径存在性是不够的。

人工复核：

```powershell
git diff --name-status 73939b8^ 73939b8
git diff --name-status d812658^ d812658
git diff 73939b8 d812658 -- src/plugins/box
git diff 8408426 HEAD -- src/core src/model src/cli src/commands src/infrastructure src/host/plugins src/plugins/builtin-commands src/plugins/builtin-shapes src/plugins/stats src/plugins/dir
```

新增源码之外的变化是测试、会话、实际输出、验证脚本及文档。A 新增的
plugins.box.config.json 是演示用配置，B 在根配置安装同样插件；没有将运行分支
藏在验证材料或依赖元数据中。

2026-11-26 合并后验证：48 项测试通过；五组 A/B 会话的 stdout 和保存 SVG
逐字节一致。Phase 1 基线在 box 接入阶段验证通过，比较时显式禁用可选插件。
root config 独立启动测试在 B 分支及合并后均通过；独立 box 单测不依赖其他插件。
XML 读回比较语义，undo/redo 比较精确快照。实际终端日志末尾 svg> 后的空格保留。

用户工作区原有 doc/transcript/README.md、docs/metrics/README.md 的笔记元数据
未混入两次接入提交。新截图不属于本阶段 CLI 必需材料；modified-star 将在下一阶段实现。
