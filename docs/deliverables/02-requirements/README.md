# 需求建模统一交付入口

归档日期：2026-10-14。维护分支：main。阶段状态：已完成，用户已确认人工审核完毕。

用户提供的[建模汇报PPT](submission/作业2-需求建模汇报-学术成果分享平台.pptx)已纳入统一交付。确认依据与材料清单见[阶段完成记录](../00-research-modeling-completion.md)。A/B方案及原始核查记录保留，阶段完成不自动改写公共契约。

本目录是两组共同交付的一套材料入口。原成员贡献保留为来源附件，方案A/B的实现细节并列，不机械合并代码，不改写原始需求编号。

| 材料 | 入口 | 状态 |
| --- | --- | --- |
| 统一需求调研报告 | [调研报告](../01-research/05-unified-research-report.md) | 采用成员9的50份统计，年份2026 |
| 系统需求规格说明书 | [01-unified-srs.md](01-unified-srs.md) | 总体正文与详细章节来源统一汇编 |
| 核心模块SPEC | [02-spec-catalog.md](02-spec-catalog.md) | 两组17份模块SPEC及UI提案，保留A/B方法差异 |
| 用例、活动、状态模型与原型 | [03-model-and-traceability-index.md](03-model-and-traceability-index.md) | 原图、模型来源、追踪表集中索引 |
| 人工核查与冲突 | [04-review-and-conflicts.md](04-review-and-conflicts.md) | 用户已确认人工审核；保留原核查记录供追溯 |
| 收件来源与版本 | [05-source-manifest.csv](05-source-manifest.csv) | 分支、提交、原始blob与当前SHA256 |

来源manifest共195条，记录远程来源blob与当前文件校验和。main此前已整理的成员1、6调研文本优先保留；成员9年份及成员1原图收件说明按用户指示修订，故部分当前文件与远程blob不同，这是有意保留/修订，可按两种校验定位。

个人Word文件保留为过程附件；统一需求调研Word保留用户最新修改。SRS与SPEC以现有Markdown汇编及详细来源附件归档。

成员1的用户提交PNG位于成员1贡献目录，按用户确认作为收到的原始图文件；这里的 `diagrams/*-reference.*` 是此前参考稿，保留供对照，不替代人工原图。最终只选定一张系统用例图提交，另一方案保留为评审附件。

本次属于调研、文档整理，按AGENT.md第8节不新增核心代码AI日志。历史声明保留原文件。
