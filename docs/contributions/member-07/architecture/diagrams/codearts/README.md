# CodeArts 架构图导出登记

2026-11-15。以下两张图在 CodeArts 软件建模平台“小图图 / 软件建模 / 需求模型”中原生绘制：组件、包、生命线、消息和组合片段都使用平台工具面板中的 UML 元素，连线与消息由平台记录源和目标，消息编号由平台自动生成。导出使用平台“文件 → 导出为”的 PNG（M7-ARCH-01 为 150%，M7-ARCH-02 为 200%）和 SVG（100%）。归档时只改文件名，不改图像内容。

| 图号 | 平台图名 | 图类型 | 平台内容 | 归档文件 |
| --- | --- | --- | --- | --- |
| M7-ARCH-01 | M7-ARCH-01 B组数据采集与处理架构 | UML 组件图（位于“组件图”目录） | 17 个 Component、4 个 Package、19 条 Dependency | [PNG](M7-ARCH-01-codearts.png) / [SVG](M7-ARCH-01-codearts.svg) |
| M7-ARCH-02 | M7-ARCH-02 采集任务异步执行与候选版本发布 B组 | UML 顺序图（位于“顺序图”目录） | 6 条生命线、22 条消息（含 Reply 与 Self Message）、1 个 loop、2 个 alt（3 + 2 个分支） | [PNG](M7-ARCH-02-codearts.png) / [SVG](M7-ARCH-02-codearts.svg) |

平台模型位置（需项目权限）：

- [M7-ARCH-01 平台模型](https://devcloud.cn-north-4.huaweicloud.com/modeling/project/d6b5b924f5e648f287fc468035975a2d/modelproject/217d595a2eb24afc9d3f2f4a09828f33/modeldesign?projectDiagramUUID=c51c24293b2e43159df5459e4d88d1e9&versionUUID=)
- [M7-ARCH-02 平台模型](https://devcloud.cn-north-4.huaweicloud.com/modeling/project/d6b5b924f5e648f287fc468035975a2d/modelproject/217d595a2eb24afc9d3f2f4a09828f33/modeldesign?projectDiagramUUID=d271f6cebe664b129b26c2a7e5e29255&versionUUID=)

[文件清单与 SHA256](export-manifest.json) 可用来核对归档文件是否完整。

## 绘制方式说明

两张图都是本人授权 AI 助手（Claude）通过浏览器操作 CodeArts 网页编辑器完成的：从工具面板把元素拖到画布并命名，用平台的连线和消息工具连接元素，在平台的“编辑条件”面板里填写 alt 分支条件。元素的坐标、尺寸和标签位置是通过编辑器页面接口批量调整的，相当于在属性面板里改坐标，不是导入外部图片或 XML。期间误建过 2 个空组件，已从图中删除，并在平台工程树中彻底删除。

## 已知限制

- PNG/SVG 是图像导出，不是可编辑工程源。如果课程要求提交工程包，需要另外在平台导出。
- M7-ARCH-02 中 alt/loop 的标题框较窄，“来源响应”“发布判定”这类操作符名称会折成两行，但不影响阅读。
- 平台提示“获准来源”与分析阶段顺序图中的生命线重名。两者语义一致，所以保留了这个名字。
- 本人理解审阅、成员 8 复核、成员 6 汇编和课堂提交都还没有完成。
