# 需求建模统一交付入口

汇编日期：2026-10-13。维护分支：main。状态：联合评审稿，尚未由成员1、6共同冻结公共契约。

本目录是两组共同交付的一套材料入口。原成员贡献保留为来源附件，方案A/B的实现细节并列，不机械合并代码，不改写原始需求编号。

| 材料 | 入口 | 状态 |
| --- | --- | --- |
| 统一需求调研报告 | [调研报告](../01-research/05-unified-research-report.md) | 采用成员9的50份统计，年份2026 |
| 系统需求规格说明书 | [01-unified-srs.md](01-unified-srs.md) | 总体正文与详细章节来源统一汇编 |
| 核心模块SPEC | [02-spec-catalog.md](02-spec-catalog.md) | 两组17份模块SPEC及UI提案，差异待确认 |
| 用例、活动、状态模型与原型 | [03-model-and-traceability-index.md](03-model-and-traceability-index.md) | 原图、模型来源、追踪表集中索引 |
| 人工核查与冲突 | [04-review-and-conflicts.md](04-review-and-conflicts.md) | 分配责任与关闭证据，不代签字 |
| 收件来源与版本 | [05-source-manifest.csv](05-source-manifest.csv) | 分支、提交、原始blob与当前SHA256 |

来源manifest共195条，记录远程来源blob与当前文件校验和。main此前已整理的成员1、6调研文本优先保留；成员9年份及成员1原图收件说明按用户指示修订，故部分当前文件与远程blob不同，这是有意保留/修订，可按两种校验定位。

本轮不处理PPT及讲稿。贡献目录README中的PPT链接属于原分支范围，在本次非PPT收件中不要求可用。仓库里的个人Word文件和旧调研Word保留为过程附件，不冒充本轮统一终稿。此次形成Markdown汇编；如课程要求Word提交，须按本轮正文重新排版导出并人工核查。

成员1的用户提交PNG位于成员1贡献目录，按用户确认作为收到的原始图文件；这里的 `diagrams/*-reference.*` 是此前参考稿，保留供对照，不替代人工原图。最终只选定一张系统用例图提交，另一方案保留为评审附件。

本次属于调研、文档整理，按AGENT.md第8节不新增核心代码AI日志。历史声明保留原文件。
