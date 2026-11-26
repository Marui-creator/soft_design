---
noteId: "fd8ae880e9a911f185a7b5fa6e6e8700"
tags: []

---

# Box：仅配置接入的独立演示

此演示分支为 feat/box-plugin-config，父提交是 8408426，与代码装配演示起点相同。
在该接入提交中，已有运行源码均未修改：只加入相同的 src/plugins/box 包，并在
根 plugins.config.json 增加一项。插件源码与方式 A 完全相同。

```powershell
npm run build
npm test
npm run cli -- --config plugins.config.json
```

`test/box-config-only.test.cjs` 在独立临时目录实际启动配置入口，逐字节比较
Phase 1 §6.1 版本 B 会话与提交日志，并检查生成 SVG 的 marker、框体颜色与文字。
该测试证明无需改动旧代码装配文件、内核、加载器或既有插件。

src/host/codePlugins.ts 在独立 B 提交时仍保持原样，因此该提交的无参数默认入口
没有 box；必须显式传 --config。两条演示历史合并之后，无参数入口和根配置均有 box，
再运行完整 `npm run test:assembly` 比较两种入口。

新测试、会话、验证脚本与文档属于验收材料，不是内核运行逻辑。测试日志保留真实
终端提示符末尾的空格，以便逐字节核对，不应为了消除 whitespace 提示裁剪日志。
