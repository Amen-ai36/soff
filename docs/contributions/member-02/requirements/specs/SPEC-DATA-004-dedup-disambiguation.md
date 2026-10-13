# SPEC-DATA-004 去重、作者消歧与机构归一化

> 追踪：R03、R07、R14
> 责任：成员 2、7 共同设计

## 1. 目标

把多个来源的同一成果、同一作者和同一机构形成可追溯、可回滚的 canonical 关系，同时控制误合并。

## 2. 成果去重

### 2.1 强标识符

| 类型 | 主标识 | 次标识 |
| --- | --- | --- |
| 论文 | DOI | OpenAlex Work ID、DBLP Key |
| 专利 | patent_office + publication_number | application_number、priority_number |
| 项目 | source + source_project_id | funder_award_id |
| 获奖 | official_notice_id | award_no + year + category |

强标识符一致时可建立确定关系。强标识符冲突时不得自动覆盖。

### 2.2 模糊候选

候选特征至少包括：

- 规范化标题相似度；
- 作者姓氏集合和顺序；
- 年份差；
- venue 或出版商；
- 成果类型；
- 机构交集；
- 语言和 DOI 缺失状态。

输出 `score`、`evidence_terms` 和 `rule_version`。低于自动阈值进入人工队列。

### 2.3 合并与回滚

`MergeEvent` 必须记录：

```text
merge_event_id
canonical_id
source_record_ids[]
score
rule_version
decision: auto | manual
operator
reason
created_at
reverted_at
```

回滚后恢复原 Source Record，并触发检索和统计重建。

## 3. 作者消歧

### 3.1 优先级

1. 强作者标识一致；
2. 门户认领或管理员确认；
3. 作者姓名变体 + 机构 + 领域 + 合作者证据；
4. 人工确认。

### 3.2 禁止规则

- 仅姓名相同不合并。
- 仅机构相同不合并。
- 仅共同作者关系相似不合并。
- 不能把人工拒绝的候选自动再次合并。

### 3.3 评分与队列

自动通过、自动拒绝和人工确认采用双阈值。人工队列显示：

- 姓名变体；
- 机构和时间线；
- ORCID/外部作者 ID；
- 代表作和主题；
- 合作者交集；
- 既有拒绝或拆分历史。

## 4. 机构归一化

1. ROR 存在时优先。
2. 别名/缩写映射必须保存来源和生效时间。
3. 父子机构与等价机构分开。
4. 合并机构产生 `InstitutionMergeEvent`，包含迁移数量和受影响作品数。
5. 机构合并后必须重算机构排名和统计快照。

## 5. 质量指标

| 指标 | 定义 |
| --- | --- |
| 误合并率 | 人工样本中被错误合并的比例 |
| 漏合并率 | 人工样本中应合并但未合并的比例 |
| Precision/Recall/F1 | 消歧系统与人工标注对比 |
| 回滚成功率 | 合并回滚后关系恢复正确比例 |
| 证据完整率 | 自动合并中评分和规则版本齐全比例 |

## 6. 验收与测试

1. DOI、专利号和项目号冲突样本不会自动覆盖。
2. 同名作者样本保持独立或进入人工队列。
3. 合并和回滚不退出来源记录。
4. 机构别名、父子和等价关系处理符合规则。
5. 质量指标可由固定脚本重复计算。
