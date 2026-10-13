# 数据源与平台访问核验

日期：2026-10-12。本次区分官方文档可读、公开记录可读、实际 API 样例成功三种证据。浏览工具限制/客户端拦截不代表源站拒绝；没有返回真实状态码时不填写 200/403/429。历史调研记录保持原日期，不用本次结果改写历史。

## 数据来源

| 来源 | 官方许可或使用条件 | 字段依据 | 本次实际访问与缺口 |
| --- | --- | --- | --- |
| OpenAlex | 元数据 CC0；当前认证文档允许基础无 key 访问，免费 key 提升额度 | 文档说明 ID、标题、DOI、年份、作者、机构、主题 | 官方文档可读；API 浏览请求被客户端阻断，未取得 JSON 样例 |
| DBLP | 官方说明元数据 CC0，并提供 ODC-BY 选项 | 检索/数据说明包含作者、标题、年份、出版及记录定位信息 | 官方许可说明可查；本次 search API 和发布目录未成功读取，字段未用响应验证 |
| CORDIS | 欧盟拥有的编辑内容 CC BY 4.0，注明来源和修改；第三方内容另受权利约束 | 实际项目页的 grant ID、标题、DOI、起止日期、协调机构、主题/关键词 | REACT 项目 101057129 页面实际可读；DET API 要注册 key，未进行授权调用或批量下载 |
| EPO OPS | 注册/OAuth；产品可集成部分数据，不能直接发布数据集本身；额度依服务条款 | 官方 REST 指南的 publication/application reference、标题、parties、分类、摘要 | 条款和说明可读；没有凭证，未访问业务 API，不视为已打通 |
| NSF | 官方搜索摘要说明 award data（含摘要）为公共领域；本次页面文本提取未再次定位到该原句，许可结论仍应留原文快照复核 | 官方 award API 说明有奖项、机构、研究者、金额和摘要等，待响应样例核实 | Award Search/下载入口可读；API 与指定 award 详情未成功取得，未验证实际导出格式 |
| 科技部获奖名单 | 公开发布不等于开放许可；无可确认的统一再分发许可 | 实际 2023 年科技进步奖名单的编号、项目、完成人、完成单位、提名单位与等级 | 官方名单可读；没有验证批量 API，采集与再分发范围仍待成员 2/7 确认 |

官方引用：[OpenAlex API](https://help.openalex.org/api/)、[认证](https://help.openalex.org/api/authentication/)、[DBLP 许可说明](https://dblp.org/faq/1474677)、[DBLP 许可变更](https://blog.dblp.org/2019/11/24/licence-change-to-cc-0/)、[CORDIS 条款](https://cordis.europa.eu/about/legal)、[REACT 实际项目页](https://cordis.europa.eu/project/id/101057129)、[CORDIS DET API](https://www.cordis.europa.eu/about/dataextractions-api)、[EPO OPS 条款](https://www.epo.org/en/service-support/ordering/terms-and-conditions/ops-terms-and-conditions)、[EPO REST 指南](https://link.epo.org/web/searching-for-patents/data/en-ops-v3.2-documentation-version-1.3.20.pdf)、[NSF Award Search](https://www.nsf.gov/funding/award-search)、[NSF API 说明](https://resources.research.gov/common/webapi/awardapisearch-v1.htm)、[科技部名单](https://www.most.gov.cn/cxfw/kjjlcx/kjjl2023/202406/t20240624_191174.html)。

建议：论文优先 OpenAlex/DBLP，项目优先 CORDIS；专利需 OPS 授权验证，获奖名单需明确使用范围。课程模拟数据可用于链路候选，必须标注模拟；这不是在未授权时宣称真实源已采集。不要把 CC0 元数据的许可扩展到链接指向的全文。

成员 2、7 的实际连接记录应包括环境与日期、来源条款版本、无密钥请求地址、真实状态码、脱敏响应样例/哈希、分页/限速、字段映射、错误处理和允许保存/再分发的范围。不得在日志提交 key、token 或私人身份数据。尚未具备这些证据的源保留“待验证”，不能宣称采集可运行。

## 同类平台

| 平台 | 本次观察 | 可支持与不可支持的结论 |
| --- | --- | --- |
| ResearchGate | 公开 researcher 搜索页面成功读取；[官方 authorship 帮助](https://help.researchgate.net/profile/authorship)可读 | 可确认公开页面与帮助说明；该查询返回同姓结果，不能宣称学术相关性正确；未登录操作认领/审核 |
| OpenAlex | 官方文档可读，API 请求客户端拦截 | 可用于字段/来源调研，不能证明本地采集成功 |
| ORCID | 本次公开 API 查询未成功取得内容 | 不记录猜测的状态码；未验证登录或授权流程 |
| Semantic Scholar | 本次 graph API 与搜索页面未成功取得内容 | 未验证实际限流，更不能写本次返回 429 |

这些结果是 AI 工具环境的访问观察，不能代替成员 3、8 在正常浏览器中复核平台操作，更不能代替真实用户访谈。
