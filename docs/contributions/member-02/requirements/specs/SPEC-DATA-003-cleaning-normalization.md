# SPEC-DATA-003 清洗与标准化

> 追踪：R03、R14
> 责任：成员 2

## 1. 目标

把不同来源的 SourceRecord 转换为统一、可比较、可追溯的规范化字段，同时保留原始值和清洗规则版本。

## 2. 输入与输出

输入：`SourceRecord`、`rule_version`、受控枚举和别名表。
输出：

```text
NormalizedRecord
  source_id
  source_record_id
  raw_fields
  normalized
    title
    title_fingerprint
    doi
    work_type
    publication_date
    venue
    authors[]
    institutions[]
    topics[]
    identifiers[]
  issues[]
  rule_version
```

## 3. 文本规则

1. 使用 Unicode NFKC 归一化。
2. 解码 HTML 实体，移除控制字符和不可见字符。
3. 折叠连续空白，去除首尾空白。
4. 保留原始标题；另生成仅用于匹配的 `title_fingerprint`。
5. 标题指纹不删除语义字符；语言相关处理必须版本化。

## 4. 标识符规则

| 字段 | 规则 |
| --- | --- |
| DOI | 去除 `https://doi.org/` 前缀，转小写，保留路径 |
| ORCID | 校验 checksum，标准化为 `https://orcid.org/...` |
| ROR | 标准化为 `https://ror.org/...` |
| 专利号 | 保存 patent_office + publication_number 组合 |
| 项目号 | 保存 funder + funder_award_id 组合 |
| 本地 ID | 不跨来源比较，除非来源已声明全局唯一 |

非法或 checksum 失败的标识符进入 `issues`，不得静默补全。

## 5. 时间、类型和分类

- 完整日期输出 ISO 8601。
- 仅知年份或年月时使用部分日期类型，不填一月一日。
- 未知、缺失和非法值使用不同状态。
- 成果类型映射到受控枚举：`paper`、`patent`、`project`、`award`。
- 领域分类同时保存来源原始分类和平台映射；未知映射使用 `unknown`。

## 6. 作者和机构

- 保留作者顺序、原始姓名、来源作者 ID 和通讯作者标记。
- 机构保留原始 affiliation 字符串、来源 institution ID、ROR 和显示名。
- 多机构作者保存机构列表，不强行压成一个字符串。

## 7. 失败与隔离

| 问题 | 处理 |
| --- | --- |
| 标题缺失 | error，隔离或进入人工 |
| DOI 非法 | warning，清空规范化 DOI，保留原始值 |
| 日期无法解析 | warning，保存原始文本和未知日期状态 |
| 作者为空 | 按成果类型决定 error 或 warning |
| 类型未知 | 保留原始类型并映射为 unknown |
| 来源字段冲突 | 不覆盖，记录 `field_conflict` |

## 8. 验收与测试

1. 固定样例的规范化和指纹结果稳定。
2. 缺失、未知、非法和真实零值可区分。
3. 原始字段在清洗后仍可访问。
4. 规则版本变化会重新计算受影响记录并生成影响报告。
