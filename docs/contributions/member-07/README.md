# 成员7数据调研与需求建模贡献

初稿日期：2026-10-11；进度补充：2026-10-13。方案归属：B组；当前供稿分支：member-07/requirements-modeling-20261013。供成员2共同复核、成员6汇编、成员1审核。

本包补充数据采集、清洗、去重、作者消歧、机构归一化和增量更新的需求与规范。它是个人章节贡献，不是第二套正式报告，也不是已批准的公共契约。旧共同调研稿保留原样，本次访问结果和修订建议单独记录，避免把历史结论覆盖成当前事实。

先读[2026-10-13进度与共同复核事项](progress-20261013.md)，查看[用户CodeArts手绘导出图](requirements/diagrams/collection-state-codearts.svg)。生成预览与平台导出分别保留，不能混称；成员2最新提交也已附平台图片和模型源文件，双方方案仍需共同确认。

## 阅读顺序

1. [本次来源验证](research/20261011-source-validation.md)：许可依据、实际访问、字段与国内来源缺口。
2. [SRS数据章节](requirements/01-srs-contribution.md)：供成员6直接汇编的功能与非功能需求。
3. [字段映射](requirements/02-field-mapping.md)：四类成果、领域、引用数和下游交接。
4. [采集与更新SPEC](requirements/specs/SPEC-M7-INGEST.md)、[清洗SPEC](requirements/specs/SPEC-M7-CLEAN.md)、[去重消歧SPEC](requirements/specs/SPEC-M7-RESOLVE.md)。
5. [验收与追踪](requirements/03-acceptance-and-traceability.md)：规则样例、实际执行范围与后续集成验收。
6. [采集状态模型](requirements/diagrams/README.md)：转移表、PlantUML源稿和预览。
7. [交接与人工待办](review-and-handoff.md)：还需本人、成员2、成员1/6和测试负责人完成的事项。
8. [展示讲稿](speaking-notes.md)、[AI使用说明](ai-use-record.md)。

## 已完成和未完成的区别

已编制：SRS章节、三份SPEC、字段映射、状态模型源稿、合成验收夹具和资料验证记录。已执行的资料及规则检查见 [validation-report.md](validation-report.md)。

已提供：用户在CodeArts手工绘制后提交的新版SVG导出图。尚未提供：该图可编辑平台模型源文件、项目/版本记录、清晰PNG和成员2共同复核结论。

未完成：真实一万条数据导入、生产模块测试、真实样本质量评估、公共审批、正式团队Word/PPT汇编和成员2共同复核。任何自动检查通过都不能替代这些事项。

没有修改成员2、6、8、9的原稿、根目录规则、公共API或正式报告。首次整理提交时按用户要求暂缓PR；2026-10-13用户随后批准将本分支向b提交供稿评审PR，不指定成员2为本次PR评审人，不自动合并。未来共同章节复核和公共审批仍按团队流程完成，不将其写成已经通过。
