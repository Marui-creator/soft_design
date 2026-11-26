# Phase 1 兼容性基线

在项目根目录运行 `npm run test:compat`。需要 Node.js、已安装的项目依赖、Git
和 PATH 中的 tar（Windows Git/系统环境提供）。

脚本从 Git 的 `final` tag 导出源码，和当前工作区源码分别编译，使用同一套已安装
依赖。每个版本、每个会话使用独立临时工作目录。不会切换分支或修改 tag，
不会覆盖仓库根目录中现有的 demo.svg、flowchart.svg 等文件。
临时 node_modules 链接要求系统允许创建目录 junction/symlink。

输入只保存命令与注释，不保存提示符或示例响应：

| 输入 | 范围 |
| --- | --- |
| cli-1.txt | Phase 1 §6 基础会话，含 other.svg 缺 ID 读入 |
| cli-flowchart.txt | Phase 1 §6.1 版本 A，分组流程图 |
| cli-commands.txt | 补充所有内置命令的调用、错误及 undo/redo |

fixtures/other.svg 为作业 §6 提供的固定外部文件。
expected/*.stdout.txt 保留 final 的实际 stdout，包括启动信息、提示符、错误和换行，
不按手册中的示意输出手写，也不做空格归一化。
expected/各会话目录保存 final 序列化的 SVG 文件。

`node scripts/verify-phase1.cjs --record` 用于首次从 final 生成预期文件；日常验证
使用不带 --record 的命令，避免无意改写基线。脚本同时核对：final 与已存预期一致，
当前 stdout 与 final 逐字节一致，保存的 SVG 文件列表与内容一致。

2026-11-26 初次验证：三个会话通过，三个保存的 SVG 文件与 final 逐字节一致。
基线提交：2e6ec3087e3af9ab72b1813a314ee8af549a3343。
这是回归基线，不能单凭这三个会话认定 Phase 1 所有边界情况均已覆盖。

脚本对当前版本显式传入 `--no-plugins`，关闭所有新增插件，尤其树标签；对历史
final 保留原启动参数。box 会话和 stats/dir 会话在插件阶段单独补充。
