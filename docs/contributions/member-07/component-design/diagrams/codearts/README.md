# CodeArts 构件设计图导出登记

2026-11-17。以下两张图在 CodeArts 软件建模平台"小图图 / 软件建模 / 需求模型"中原生绘制：生命线、消息、组合片段、活动节点和控制流都使用平台工具面板里的 UML 元素，消息编号由平台自动生成。导出使用平台"文件 → 导出为"的 PNG（M7-COMP-01 为 200%，M7-COMP-02 为 150%）和 SVG（100%），归档时只改文件名，不改图像内容。

| 图号 | 平台图名 | 图类型 | 平台内容 | 归档文件 |
| --- | --- | --- | --- | --- |
| M7-COMP-01 | M7-COMP-01 采集适配与调度 B组 | UML 顺序图（"顺序图"目录） | 6 条生命线、19 条消息（含返回消息）、1 个 loop、1 个 alt（3 个分支） | [PNG](M7-COMP-01-codearts.png) / [SVG](M7-COMP-01-codearts.svg) |
| M7-COMP-02 | M7-COMP-02 数据处理管道判定流程 B组 | UML 活动图（"活动图"目录） | 1 个 Initial、11 个 Action、6 个 Decision、4 个 Final、24 条 Control Flow（其中 12 条带分支条件） | [PNG](M7-COMP-02-codearts.png) / [SVG](M7-COMP-02-codearts.svg) |

平台模型位置（需项目权限）：

- [M7-COMP-01 平台模型](https://devcloud.cn-north-4.huaweicloud.com/modeling/project/d6b5b924f5e648f287fc468035975a2d/modelproject/217d595a2eb24afc9d3f2f4a09828f33/modeldesign?projectDiagramUUID=37af2d82bef447169f7907fb64fdd1e0&versionUUID=)
- [M7-COMP-02 平台模型](https://devcloud.cn-north-4.huaweicloud.com/modeling/project/d6b5b924f5e648f287fc468035975a2d/modelproject/217d595a2eb24afc9d3f2f4a09828f33/modeldesign?projectDiagramUUID=40d4b11e77fa417da7bbd8c766a545de&versionUUID=)

[文件清单与 SHA256](export-manifest.json) 可核对归档文件是否完整。

## 绘制方式说明

两张图都是本人授权 AI 助手（Claude）通过浏览器操作 CodeArts 网页编辑器完成的：从工具面板把元素拖到画布并命名，用平台的消息和控制流工具连线，在平台的"编辑条件"面板里填写 alt 分支条件。元素的位置、尺寸和标签偏移是通过编辑器页面接口批量调整的，相当于在属性面板里改坐标。M7-COMP-02 中有 2 条控制流（`valid → 终点`、`质量闸门判定 → quarantine`）鼠标拖拽两次都没有成功，改用编辑器的接口，以同一条已有控制流为模板创建；它们仍然是平台里类型为 Control Flow、有明确源和目标的元素。

## 已知限制

- PNG/SVG 是图像导出，不是可编辑工程源。如果课程要求提交工程包，需要另外在平台导出。
- M7-COMP-01 里 alt 和 loop 的标题框较窄，"来源响应"等名称会折行，不影响阅读。
- M7-COMP-02 的 Decision 菱形上没有文字，判定问题写在菱形上方的标签里。
- 本人理解审阅、成员 8 汇编和课堂提交都还没有完成。
