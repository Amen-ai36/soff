# 系统需求规格说明书（SRS）- 统一交付物

状态：需求建模阶段（第 3～6 周），进行中

## 1. 交付物清单

### 1.1 核心文档

| 文件 | 描述 | 负责人 | 状态 |
|------|------|--------|------|
| [01-introduction.md](01-introduction.md) | 引言、目的、范围、定义 | 成员 1、6 | ⏳ 待编写 |
| [02-overall-description.md](02-overall-description.md) | 系统概述、用户特征、约束 | 成员 1、6 | ⏳ 待编写 |
| [03-functional-requirements.md](03-functional-requirements.md) | 功能需求汇总 | 全员 | 🔄 部分完成 |
| [04-non-functional-requirements.md](04-non-functional-requirements.md) | 非功能需求汇总 | 全员 | 🔄 部分完成 |
| [05-ui-requirements.md](05-ui-requirements.md) | 用户界面需求（成员 4、9 供稿） | 成员 4、9 | ✅ 已供稿 |
| [06-data-requirements.md](06-data-requirements.md) | 数据采集与处理需求（成员 2、7 供稿） | 成员 2、7 | ✅ 成员7已供稿 |
| [07-backend-requirements.md](07-backend-requirements.md) | 检索、认领、统计需求（成员 3、8 供稿） | 成员 3、8 | ⏳ 待供稿 |
| [08-traceability-matrix.md](08-traceability-matrix.md) | 需求追溯矩阵 | 成员 5、10 | ⏳ 待编写 |
| [09-acceptance-criteria.md](09-acceptance-criteria.md) | 验收标准 | 成员 1、6 | ⏳ 待编写 |

### 1.2 UML 模型

| 文件 | 描述 | 负责人 | 状态 |
|------|------|--------|------|
| [diagrams/use-case-diagram.puml](diagrams/use-case-diagram.puml) | 用例图 | 成员 1、6 | ⏳ 待编写 |
| [diagrams/claim-activity-diagram.puml](diagrams/claim-activity-diagram.puml) | 认领审核活动图 | 成员 3、8 | ⏳ 待编写 |
| [diagrams/collection-state-diagram.puml](diagrams/collection-state-diagram.puml) | 采集任务状态图 | 成员 2、7 | ✅ 成员7已完成 |
| [diagrams/claim-state-diagram.puml](diagrams/claim-state-diagram.puml) | 认领申请状态图 | 成员 3、8 | ⏳ 待编写 |
| [diagrams/ui-navigation-diagram.puml](diagrams/ui-navigation-diagram.puml) | 导航结构图（可选） | 成员 4、9 | ⏳ 待编写 |

### 1.3 SPEC 文档

| 文件 | 描述 | 负责人 | 状态 |
|------|------|--------|------|
| [specs/SPEC-COLLECTION.md](specs/SPEC-COLLECTION.md) | 数据采集模块规格 | 成员 2、7 | ✅ 成员7已完成 |
| [specs/SPEC-CLEANING.md](specs/SPEC-CLEANING.md) | 数据清洗模块规格 | 成员 2、7 | ✅ 成员7已完成 |
| [specs/SPEC-DISAMBIGUATION.md](specs/SPEC-DISAMBIGUATION.md) | 消歧模块规格 | 成员 2、7 | ✅ 成员7已完成 |
| [specs/SPEC-SEARCH.md](specs/SPEC-SEARCH.md) | 检索模块规格 | 成员 3、8 | ⏳ 待编写 |
| [specs/SPEC-CLAIM.md](specs/SPEC-CLAIM.md) | 认领模块规格 | 成员 3、8 | ⏳ 待编写 |
| [specs/SPEC-UI.md](specs/SPEC-UI.md) | UI 交互规格 | 成员 4、9 | ✅ 成员9已完成 |

### 1.4 支撑材料

| 目录 | 描述 | 状态 |
|------|------|------|
| [contributions/](../contributions/) | 各成员个人贡献包 | 🔄 持续更新 |
| [evidence/](evidence/) | 需求证据和参考资料 | 🔄 持续收集 |
| [reviews/](reviews/) | 评审记录和问题跟踪 | ⏳ 待建立 |

## 2. 成员贡献包索引

### 2.1 成员 4（A 组 UI/前端）

**位置**：`docs/contributions/member-04/requirements/`

**内容**：
- UI范围、角色边界与信息架构
- 检索、详情与学者门户交互需求
- 认领、门户维护与反馈交互需求
- 可用性需求与UI验收场景

**方案取向**：检索优先

### 2.2 成员 7（B 组数据采集/ETL）

**位置**：`docs/contributions/member-07/requirements/`

**内容**：
- 数据采集、清洗、消歧需求与 SPEC
- 采集任务状态图
- 字段映射与验收标准
- 追溯矩阵

**已提供**：3 个 SPEC、状态图、验证脚本

### 2.3 成员 9（B 组 UI/前端）

**位置**：`docs/contributions/member-09/requirements/`

**内容**：
- 用户界面与导航需求（方案 B）
- 检索交互需求（基于问卷数据）
- 认领与门户维护交互需求
- 可用性需求与验收场景
- 追溯矩阵与交接清单

**方案取向**：场景平衡

**证据基础**：50 份问卷（E-B-Q-001）

## 3. 汇编规则

### 3.1 方案差异处理

**原则**：同一份 SRS，差异写入"方案 A / 方案 B"小节

**示例**：

```markdown
## 3.1 首页布局需求

### 方案 A（检索优先，成员 4）
首页以单一检索框为主入口...

### 方案 B（场景平衡，成员 9）
首页提供三个并列入口：检索、领域浏览、统计分析...

### 对比与建议
| 维度 | 方案 A | 方案 B | 建议 |
|------|--------|--------|------|
| 首页入口 | 单一检索 | 三入口并列 | 待决定 |
```

### 3.2 编号规则

- **功能需求**：`FR-XX-YY`（XX = 模块，YY = 序号）
  - `FR-UI-01`：用户界面需求
  - `FR-SR-01`：检索需求
  - `FR-CL-01`：认领需求
  - `FR-DA-01`：数据采集需求
  
- **非功能需求**：`NFR-XX-YY`
  - `NFR-PE-01`：性能需求
  - `NFR-SE-01`：安全需求
  - `NFR-US-01`：可用性需求

- **验收场景**：`AC-XX-YY`

### 3.3 引用规范

- **成员贡献**：`[成员 X 方案 Y](../contributions/member-0X/requirements/...)`
- **问卷证据**：`E-B-Q-001`（成员 9 问卷）
- **访谈证据**：`E-A-I-001`（成员 4 访谈，如有）
- **竞品分析**：`E-C-001`（成员 3、8 竞品）

## 4. 当前进度

### 4.1 已完成供稿（✅）

| 成员 | 内容 | 页数 | 需求数 |
|------|------|------|--------|
| 成员 7 | 数据采集、清洗、消歧 | ~15 页 | 3 个 SPEC |
| 成员 9 | UI、导航、检索、认领、可用性 | ~37 页 | 24 功能 + 25 非功能 |
| 成员 4 | UI、检索、认领、可用性 | ~20 页 | 估算 20+ 需求 |

### 4.2 待供稿（⏳）

| 成员 | 内容 | 截止时间 |
|------|------|----------|
| 成员 1、6 | 引言、总体描述、验收标准 | 第 5 周 |
| 成员 3、8 | 检索、认领、统计、认证需求 | 第 5 周 |
| 成员 5、10 | 追溯矩阵、评审记录 | 第 6 周 |

### 4.3 UML 图待编写（⏳）

- [ ] 用例图（成员 1、6）
- [ ] 认领审核活动图（成员 3、8）
- [x] 采集任务状态图（成员 7 已完成）
- [ ] 认领申请状态图（成员 3、8）

## 5. 下一步行动

### 立即行动（本周）
1. **成员 6**（汇编负责人）：确认 SRS 目录结构，分配剩余章节
2. **成员 1**：提供引言、范围、定义
3. **成员 3、8**：补充后端需求供稿
4. **成员 5、10**：建立追溯矩阵模板

### 第 5 周
1. 汇编所有供稿到统一 SRS
2. 绘制剩余 UML 图
3. 第一轮内部评审

### 第 6 周
1. 根据评审意见修订
2. 完成追溯矩阵
3. 最终版本确认和提交

## 6. 质量检查清单

- [ ] 所有需求有唯一编号
- [ ] 所有需求可追溯到证据来源
- [ ] 方案 A / B 差异明确标注
- [ ] 待决定问题明确列出
- [ ] UML 图与需求一致
- [ ] SPEC 格式统一
- [ ] 术语表一致
- [ ] 图表编号连续

---

**汇编负责人**：成员 6  
**复核负责人**：成员 1  
**最后更新**：2024-10-13  
**状态**：进行中，等待成员 1、3、6、8 供稿
