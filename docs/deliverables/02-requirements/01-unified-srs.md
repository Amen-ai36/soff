# 学术成果分享平台系统需求规格说明书

版本：0.1联合汇编稿；日期：2026-10-13；汇编负责人：成员1、6。本文连同下述详细章节构成唯一SRS评审包。来源提案不等于已冻结公共契约。

## 1 引言与系统边界

系统为普通查询用户、科研人员和平台管理员提供公开学术成果发现、学者门户、认领和数据治理。两组实现同一核心范围，内部算法、架构、界面和辅助功能可不同。成果覆盖论文、专利、科研项目、获奖。数据链路为公开来源/模拟数据→采集→清洗、去重、消歧→数据库与Elasticsearch→检索、门户、认领、统计→前端与后台。

课程约束是最终支持不少于10000条成果，演示同批次完整链路、至少一项创新，至少三个核心模块行覆盖率不低于80%。当前文档及合成夹具不能证明上述运行指标已达到。后期付费服务是否纳入一期由成员1、6向教师确认。

## 2 用户特征与证据

采用成员9问卷E-B-Q-001，便利抽样50份，2026-09-22发布、2026-10-12截止，微信问卷星小程序发放。身份为本科生22、研究生20、教师/科研人员6、其他2。首选关键词42/50；同名困扰40/50；来源关注48/50；更新时间关注47/50；空结果相似词需求38/50；详情认领入口45/50。对应原题Q3、Q6、Q7、Q8、Q9、Q11见[成员9分析](../../contributions/member-09/research/07-questionnaire-analysis.md)。

上述是成员提交的汇总数据，原始逐份答卷尚未归档，便利样本不能推广总体。旧35/30/23份PDF是历史附件，不是50份原始证据。来源可用性证据见成员2、7，公开平台操作见成员3，竞品资料见成员8。真实科研人员、管理员访谈尚无完成证据。

## 3 参与者、术语与权限

访客使用公开查询；登录用户可申请本人门户认领、查询本人申请；已认领且已授权学者维护其门户；管理员管理任务、审核与治理，不得自审。公开数据源提供经批准数据。调度器是否属于外部参与者取决于系统边界，最终图需共同确认。

账号为登录主体，学者为科研实体，门户为公开展示，认领为维护授权请求。姓名相同不代表同一学者，申请不等于授权，认领不转移知识产权。共享成果元数据、个人展示关联、私有认领证明分别管理。

## 4 总体功能及详细章节

以下沿用成员1的M1-FR编号作为汇编定位键，不替换main原R编号；成员8的R映射按其原文保留，不按数字顺序强行对应。

| 汇编需求 | 预期行为 | 详细章节与责任 |
| --- | --- | --- |
| M1-FR-01 | 登录、退出、会话失效和服务端资源授权 | 成员3/8认证SPEC |
| M1-FR-02、03 | 配置、启动、查看、停止、恢复采集；四类成果合规接入 | 成员2/7数据章节与采集SPEC |
| M1-FR-04、05 | 清洗、标准化、去重、消歧、机构归一、增量与冲突治理 | 成员2/7算法SPEC；更新不覆盖人工修正 |
| M1-FR-06 | 公开成果/学者检索、关键词、类型/时间/机构/领域组合过滤、排序分页 | 成员3/8检索SPEC、成员4/9交互章节 |
| M1-FR-07 | 来源与更新时间、模拟标记、门户四类成果 | 成员3/8门户章节，成员4/9页面章节 |
| M1-FR-08、09 | 受控证明、本人申请查询、回避审核、状态授权与审计一致 | 成员3/8认领用例、活动与状态模型、认领SPEC |
| M1-FR-10、13 | 授权内维护、补录/关联纠错、公共字段冲突复核 | 成员3/8业务与接口约束，成员4/9维护页面 |
| M1-FR-11、12 | 去重成果排名/类型/领域分布，专家关系与领域热点 | 成员3/8统计SPEC，口径及分母须展示 |
| M1-FR-14、15 | 同批次完整链路及至少一项获确认创新 | 全体技术岗位；创新候选另立验收 |

详细正文附件：

- 总体需求：[成员1参与者与功能](../../contributions/member-01/requirements/02-actors-and-overall-requirements.md)、[成员6总体汇编](../../contributions/member-06/showcase-20261014/06-srs-assembly.md)。成员6旧问卷段落被本文第2节取代。
- 数据：[成员2数据处理需求](../../contributions/member-02/requirements/01-data-pipeline-requirements.md)、[成员7数据需求](../../contributions/member-07/requirements/01-srs-contribution.md)、[字段映射](../../contributions/member-07/requirements/02-field-mapping.md)。
- 业务：[成员3章节](../../contributions/member-03/requirements/01-srs-contribution.md)、[成员8章节](../../contributions/member-08/requirements/01-srs-contribution.md)。
- 界面：[成员4信息架构](../../contributions/member-04/requirements/01-ui-scope-and-information-architecture.md)、[检索门户](../../contributions/member-04/requirements/02-search-and-portal-interactions.md)、[认领维护](../../contributions/member-04/requirements/03-claim-and-maintenance-interactions.md)；[成员9导航](../../contributions/member-09/requirements/01-ui-requirements-and-navigation.md)、[检索](../../contributions/member-09/requirements/02-search-interaction-requirements.md)、[认领](../../contributions/member-09/requirements/03-claim-interaction-requirements.md)。

## 5 数据与外部接口约束

接入前审批来源与许可，不绕过登录、验证码和收费限制。保留来源链接、采集时间、规则版本和处理状态；未知值不表示0；低置信度不自动合并；模拟数据明确标记。来源记录与规范成果计数分开。证明材料不进入公开响应、索引或日志正文。

[成员3接口约束](../../contributions/member-03/requirements/03-interface-constraints.md)与[成员8接口约束](../../contributions/member-08/requirements/03-interface-constraints.md)作为A/B提案并列。尚无共同批准OpenAPI，禁止用本次汇编单方面冻结字段、状态枚举、错误码或数据库语义。

## 6 非功能、异常及可用性

应拒绝越权和自审；写失败不能产生部分维护授权；故障不能伪装正常空结果；同版本查询排序和统计可复现；关键变更与人工修正可追溯。采集应限速、退避、可停止、可查失败原因。界面保留输入条件、定位错误字段、区分空态和失败、展示来源与更新信息。

[成员1非功能总纲](../../contributions/member-01/requirements/03-non-functional-and-acceptance.md)、[成员4可用性](../../contributions/member-04/requirements/04-usability-and-acceptance.md)、[成员9可用性](../../contributions/member-09/requirements/04-usability-requirements.md)为详细章节。P95秒数、并发负载、上传大小、30天过期提示、消歧阈值等均为候选指标，须确定数据集、环境与测量方法后共同批准。

## 7 用例与模型

[模型目录与追踪索引](03-model-and-traceability-index.md)提供两组系统用例图、认领活动/状态图、采集状态图及原型。系统用例必须覆盖采集管理、门户认领、审核、检索查看、统计和成果管理。最终一张系统用例图由成员1、6共同确定；状态图不能与实际规范的枚举和转移相互矛盾。

## 8 验收与追踪

按[成员3验收](../../contributions/member-03/requirements/04-acceptance-scenarios.md)、[成员8验收](../../contributions/member-08/requirements/04-acceptance-scenarios.md)、[成员7数据验收](../../contributions/member-07/requirements/03-acceptance-and-traceability.md)复核正常、边界和异常场景。

重点覆盖：重复接入不重复计数、同名不误合并、空结果/故障区分、来源真实性、本人和他人权限、重复申请与并发审核、停止和失败恢复、人工修正冲突、统计手算对账、同批次链路。fixtures是合成规则样例，贡献中的验证报告只证明其所记录检查，不等于系统测试全部通过。

## 9 联合评审与版本

所有差异与责任见[人工核查表](04-review-and-conflicts.md)。收件清单见[来源manifest](05-source-manifest.csv)。成员5、10材料已纳入追踪/证据附件，但不能把收件等同于签字。文档汇编及用户指定统计、年份更新由用户授权；公共语义仍待成员1、6共同确认后再更新为冻结版。
