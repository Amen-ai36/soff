# SPEC-DATA-005 增量更新与冲突处理

> 追踪：R04、R11
> 责任：成员 2

## 1. 目标

在冻结基准数据之外，按来源 checkpoint 增量获取变化，保证不重复、不丢更新、可恢复，并保护人工修正不被静默覆盖。

## 2. Checkpoint 模型

```text
SourceCheckpoint
  source_id
  scope_hash
  checkpoint_type: timestamp | cursor | page | version | file
  checkpoint_value
  source_version
  last_success_task_id
  last_success_at
  manifest_hash
```

checkpoint 只能在批次提交成功后原子推进。

## 3. 变更类型

| 类型 | 处理 |
| --- | --- |
| NEW | 清洗、去重后插入 canonical |
| UPDATED | 记录来源更新时间和字段哈希，执行合并策略 |
| DELETED | 写入 tombstone/停用状态，不直接物理删除审计 |
| UNCHANGED | 跳过写库，计入跳过数 |
| CONFLICT | 生成冲突记录，保留来源版和人工版 |

## 4. 冲突策略

1. 人工维护字段优先于自动来源更新，除非管理员显式批准。
2. 来源更新字段与人工字段重叠时，进入 `manual_review_required`。
3. 共享成果的公共字段不能被单个学者无审查覆盖。
4. 冲突解决记录保存操作者、时间、选择值和理由。
5. 冲突未解决前，公开页面显示上次批准版本和更新时间。

## 5. 重放与一致性

1. 相同 dataset_version、checkpoint 和算法版本重复运行应得到零新增。
2. 批次幂等键为 `source_id + source_version + batch_hash`。
3. 写 canonical 成功后索引失败，只重放索引阶段，不重新调用来源。
4. checkpoint 损坏时回退到上一 manifest，不允许从任意猜测位置继续。

## 6. 更新报告

```text
new_count
updated_count
unchanged_count
deleted_count
conflict_count
failed_count
checkpoint_before
checkpoint_after
source_version
task_id
```

## 7. 验收与测试

1. 新增、修改、删除、未变化和冲突样例均有测试。
2. checkpoint 推进与事务提交保持一致。
3. 重放不产生重复 canonical 记录。
4. 人工修正不会被自动更新覆盖。
5. 更新报告可复算并关联批次证据。
